'use strict'

const { Prisma } = require('@prisma/client')
const { AppError } = require('../utils/AppError.js')
const env = require('../config/env.js')
const logger = require('../config/logger.js')
const { appendDealEvent, DEAL_EVENT_TYPES } = require('./dealEventService.js')
const { applyDealTransition } = require('./dealLifecycleService.js')
const { DEAL_INCLUDE } = require('./dealCreationService.js')
const { USER_PUBLIC_SELECT } = require('./sellerProfileService.js')

const DEAL_PAYMENT_INCLUDE = {
  ...DEAL_INCLUDE,
  buyer: { select: USER_PUBLIC_SELECT },
  seller: { select: USER_PUBLIC_SELECT },
  quoteRequest: {
    select: {
      id: true,
      rfqNumber: true,
      status: true,
    },
  },
}

const DEFAULT_PROVIDER = 'dummy'

/**
 * Payment gateway adapter surface — plug Razorpay/Cashfree later without schema changes.
 * @typedef {object} DealPaymentGateway
 * @property {(input: object) => Promise<object>} createPaymentIntent
 * @property {(input: object) => Promise<object>} confirmPayment
 */

/** @type {DealPaymentGateway|null} */
let paymentGateway = null

function registerPaymentGateway(gateway) {
  paymentGateway = gateway
}

function getPaymentGateway() {
  return paymentGateway
}

function assertDummyPaymentAllowed() {
  if (!env.allowDummyDealPayments) {
    throw new AppError(
      'Deal charge payments are not available. Configure a production payment provider.',
      503,
      'PAYMENT_PROVIDER_UNAVAILABLE',
    )
  }
}

function buildPaymentReference(dealNumber, payerRole) {
  return `DPAY-${dealNumber}-${payerRole}`
}

/**
 * Row-level lock on the deal to serialize concurrent buyer/seller payments.
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 */
async function lockDealRow(tx, dealId) {
  // deals.id is TEXT in PostgreSQL (see migration 20260718163000_deal_management)
  await tx.$queryRaw`SELECT id FROM deals WHERE id = ${dealId} FOR UPDATE`
}

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 */
async function loadDealForPaymentResponse(tx, dealId) {
  return tx.deal.findUnique({
    where: { id: dealId },
    include: DEAL_PAYMENT_INCLUDE,
  })
}

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 */
async function createPendingDealPayment(tx, {
  dealId,
  dealNumber,
  payerRole,
  payerUserId,
  amount,
  currency = 'INR',
  provider = DEFAULT_PROVIDER,
}) {
  if (!dealId || !dealNumber || !payerRole || !payerUserId) {
    throw new AppError('Missing required payment fields.', 500, 'PAYMENT_CREATE_FAILED')
  }

  const paymentReference = buildPaymentReference(dealNumber, payerRole)
  const decimalAmount = amount instanceof Prisma.Decimal
    ? amount
    : new Prisma.Decimal(amount.toString())

  const existing = await tx.dealPayment.findUnique({
    where: {
      dealId_payerRole: {
        dealId,
        payerRole,
      },
    },
  })

  if (existing) {
    return existing
  }

  const payment = await tx.dealPayment.create({
    data: {
      dealId,
      payerRole,
      payerUserId,
      paymentReference,
      provider,
      paymentStatus: 'PENDING',
      amount: decimalAmount,
      currency,
    },
  })

  logger.info(
    {
      dealId,
      paymentId: payment.id,
      payerRole,
      paymentReference,
      amount: decimalAmount.toString(),
    },
    'Deal payment created',
  )

  return payment
}

function getPaymentByRole(payments, payerRole) {
  return payments.find((row) => row.payerRole === payerRole) ?? null
}

function isPaymentSuccessful(payment) {
  return Boolean(payment && payment.paymentStatus === 'SUCCESS')
}

function areBothDealPaymentsSuccessful(payments = []) {
  return isPaymentSuccessful(getPaymentByRole(payments, 'BUYER'))
    && isPaymentSuccessful(getPaymentByRole(payments, 'SELLER'))
}

function isContactUnlockEligible(deal, payments = []) {
  if (!deal || deal.contactUnlockStatus === 'UNLOCKED') {
    return false
  }
  return deal.status === 'PAYMENT_PENDING' && areBothDealPaymentsSuccessful(payments)
}

/**
 * Idempotently mark one party payment SUCCESS. Never appends duplicate success events.
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 */
async function markPaymentSuccessful(tx, payment, actorUserId, provider = DEFAULT_PROVIDER) {
  if (payment.paymentStatus === 'SUCCESS') {
    return { updated: false, payment }
  }

  const paidAt = new Date()
  const updateResult = await tx.dealPayment.updateMany({
    where: {
      id: payment.id,
      paymentStatus: 'PENDING',
    },
    data: {
      paymentStatus: 'SUCCESS',
      paidAt,
      providerPaymentId: payment.providerPaymentId || `${provider}_${payment.paymentReference}`,
    },
  })

  if (updateResult.count === 0) {
    const current = await tx.dealPayment.findUnique({ where: { id: payment.id } })
    if (current?.paymentStatus === 'SUCCESS') {
      return { updated: false, payment: current }
    }
    throw new AppError('Payment could not be completed.', 409, 'PAYMENT_CONFLICT')
  }

  await appendDealEvent(tx, {
    dealId: payment.dealId,
    eventType: DEAL_EVENT_TYPES.PAYMENT_SUCCESS,
    actorId: actorUserId,
    payload: {
      paymentId: payment.id,
      payerRole: payment.payerRole,
      provider,
      paymentReference: payment.paymentReference,
    },
  })

  logger.info(
    {
      dealId: payment.dealId,
      paymentId: payment.id,
      payerRole: payment.payerRole,
    },
    'Deal payment marked successful (dummy provider)',
  )

  return {
    updated: true,
    payment: {
      ...payment,
      paymentStatus: 'SUCCESS',
      paidAt,
      providerPaymentId: `${provider}_${payment.paymentReference}`,
    },
  }
}

/**
 * Unlock contact when both deal charge payments succeed.
 * Safe under concurrent payments — deal row must already be locked.
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 */
async function unlockDealContactIfEligible(tx, deal, payments, actorUserId) {
  if (!isContactUnlockEligible(deal, payments)) {
    return deal
  }

  const transitioned = await applyDealTransition(
    tx,
    deal,
    'ACTIVE',
    actorUserId,
    'Both buyer and seller deal charges paid',
  )

  const unlockResult = await tx.deal.updateMany({
    where: {
      id: deal.id,
      contactUnlockStatus: 'LOCKED',
    },
    data: {
      contactUnlockStatus: 'UNLOCKED',
      contactUnlockedAt: new Date(),
    },
  })

  if (unlockResult.count === 0) {
    return tx.deal.findUnique({
      where: { id: deal.id },
      include: { payments: true },
    })
  }

  await appendDealEvent(tx, {
    dealId: deal.id,
    eventType: DEAL_EVENT_TYPES.CONTACT_UNLOCKED,
    actorId: actorUserId,
    payload: {
      contactUnlockStatus: 'UNLOCKED',
    },
  })

  logger.info({ dealId: deal.id, dealNumber: deal.dealNumber }, 'Deal contact unlocked')

  return {
    ...transitioned,
    contactUnlockStatus: 'UNLOCKED',
    contactUnlockedAt: new Date(),
  }
}

/**
 * Process a deal charge payment using the active payment provider.
 */
async function processDealPayment(client, { dealId, payerRole, actorUserId }) {
  const PaymentProviderFactory = require('./payment/PaymentProviderFactory.js')
  const db = client
  const provider = PaymentProviderFactory.getProvider()

  const run = async (tx) => {
    return provider.processPayment(tx, { dealId, payerRole, actorUserId })
  }

  if (typeof db.$transaction === 'function') {
    return db.$transaction(run)
  }

  return run(db)
}

/**
 * Process a dummy deal charge payment for one party.
 * @param {import('@prisma/client').Prisma.TransactionClient} [client]
 */
async function processDummyDealPayment(client, { dealId, payerRole, actorUserId }) {
  assertDummyPaymentAllowed()
  return processDealPayment(client, { dealId, payerRole, actorUserId })
}

module.exports = {
  DEFAULT_PROVIDER,
  registerPaymentGateway,
  getPaymentGateway,
  assertDummyPaymentAllowed,
  buildPaymentReference,
  createPendingDealPayment,
  getPaymentByRole,
  isPaymentSuccessful,
  areBothDealPaymentsSuccessful,
  isContactUnlockEligible,
  lockDealRow,
  markPaymentSuccessful,
  unlockDealContactIfEligible,
  loadDealForPaymentResponse,
  processDealPayment,
  processDummyDealPayment,
}
