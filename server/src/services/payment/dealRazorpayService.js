'use strict'

const crypto = require('crypto')
const Razorpay = require('razorpay')
const { Prisma } = require('@prisma/client')
const env = require('../../config/env.js')
const { AppError } = require('../../utils/AppError.js')
const {
  lockDealRow,
  markPaymentSuccessful,
  unlockDealContactIfEligible,
  loadDealForPaymentResponse,
  getPaymentByRole,
} = require('../dealPaymentService.js')

const PENDING_DEDUP_WINDOW_MS = 15 * 60 * 1000

function getRazorpay() {
  if (!env.razorpayKeyId || !env.razorpayKeySecret) {
    throw new AppError(
      'Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env',
      503,
      'RAZORPAY_NOT_CONFIGURED',
    )
  }
  return new Razorpay({ key_id: env.razorpayKeyId, key_secret: env.razorpayKeySecret })
}

function amountToPaise(amount) {
  const decimal = amount instanceof Prisma.Decimal
    ? amount
    : new Prisma.Decimal(String(amount))
  return decimal.mul(100).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP).toNumber()
}

async function assertPaymentAccess(tx, dealId, payerRole, actorUserId) {
  await lockDealRow(tx, dealId)

  const deal = await tx.deal.findUnique({
    where: { id: dealId },
    include: { payments: true },
  })

  if (!deal) {
    throw new AppError('Deal not found.', 404, 'DEAL_NOT_FOUND')
  }

  const payment = getPaymentByRole(deal.payments, payerRole)
  if (!payment) {
    throw new AppError('Deal payment record not found.', 404, 'PAYMENT_NOT_FOUND')
  }

  if (payment.payerUserId !== actorUserId) {
    throw new AppError('Forbidden', 403, 'FORBIDDEN')
  }

  if (payment.paymentStatus === 'SUCCESS') {
    return { deal, payment, alreadyPaid: true }
  }

  if (deal.status !== 'PAYMENT_PENDING' && deal.contactUnlockStatus !== 'UNLOCKED') {
    throw new AppError('Deal is not awaiting payment.', 400, 'INVALID_PAYMENT_STATE')
  }

  const { recalculatePendingDealCharges } = require('../dealChargeService.js')
  const updatedDeal = await recalculatePendingDealCharges(tx, deal)
  const freshPayment = updatedDeal.payments.find((row) => row.id === payment.id) || payment

  return { deal: updatedDeal, payment: freshPayment, alreadyPaid: false }
}

/**
 * Create a Razorpay order for a pending deal charge payment.
 */
async function createDealPaymentOrder(client, { dealId, payerRole, actorUserId }) {
  const db = client

  const run = async (tx) => {
    const { deal, payment, alreadyPaid } = await assertPaymentAccess(tx, dealId, payerRole, actorUserId)

    if (alreadyPaid) {
      return {
        alreadyPaid: true,
        deal: await loadDealForPaymentResponse(tx, dealId),
      }
    }

    const recentPending = payment.providerOrderId
      && payment.paymentStatus === 'PENDING'
      && payment.updatedAt
      && (Date.now() - new Date(payment.updatedAt).getTime()) < PENDING_DEDUP_WINDOW_MS
      ? payment
      : null

    if (recentPending?.providerOrderId) {
      return {
        razorpayOrderId: recentPending.providerOrderId,
        amount: amountToPaise(recentPending.amount),
        currency: recentPending.currency || 'INR',
        keyId: env.razorpayKeyId,
        paymentReference: recentPending.paymentReference,
        resumed: true,
      }
    }

    const razorpay = getRazorpay()
    const amountPaise = amountToPaise(payment.amount)

    const rzpOrder = await razorpay.orders.create({
      amount: amountPaise,
      currency: payment.currency || 'INR',
      receipt: payment.paymentReference.slice(0, 40),
      notes: {
        dealId,
        payerRole,
        payerUserId: actorUserId,
        paymentReference: payment.paymentReference,
      },
    })

    await tx.dealPayment.update({
      where: { id: payment.id },
      data: {
        provider: 'razorpay',
        providerOrderId: rzpOrder.id,
      },
    })

    return {
      razorpayOrderId: rzpOrder.id,
      amount: amountPaise,
      currency: payment.currency || 'INR',
      keyId: env.razorpayKeyId,
      paymentReference: payment.paymentReference,
      resumed: false,
    }
  }

  if (typeof db.$transaction === 'function') {
    return db.$transaction(run)
  }
  return run(db)
}

/**
 * Verify Razorpay signature and mark deal charge payment successful.
 */
async function verifyDealPayment(client, {
  dealId,
  payerRole,
  actorUserId,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}) {
  const db = client

  const run = async (tx) => {
    const { deal, payment, alreadyPaid } = await assertPaymentAccess(tx, dealId, payerRole, actorUserId)

    if (alreadyPaid) {
      return loadDealForPaymentResponse(tx, dealId)
    }

    if (!payment.providerOrderId || payment.providerOrderId !== razorpayOrderId) {
      throw new AppError('Payment order mismatch.', 400, 'PAYMENT_ORDER_MISMATCH')
    }

    const expectedSignature = crypto
      .createHmac('sha256', env.razorpayKeySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex')

    if (expectedSignature !== razorpaySignature) {
      await tx.dealPayment.updateMany({
        where: { id: payment.id, paymentStatus: 'PENDING' },
        data: {
          paymentStatus: 'FAILED',
          failureReason: 'Signature verification failed',
        },
      })
      throw new AppError('Payment verification failed', 400, 'PAYMENT_VERIFICATION_FAILED')
    }

    await tx.dealPayment.update({
      where: { id: payment.id },
      data: {
        providerPaymentId: razorpayPaymentId,
        providerSignature: razorpaySignature,
      },
    })

    await markPaymentSuccessful(tx, payment, actorUserId, 'razorpay')

    const payments = await tx.dealPayment.findMany({
      where: { dealId: deal.id },
      orderBy: { createdAt: 'asc' },
    })

    const refreshedDeal = await tx.deal.findUnique({
      where: { id: deal.id },
      include: { payments: true },
    })

    await unlockDealContactIfEligible(tx, refreshedDeal, payments, actorUserId)

    return loadDealForPaymentResponse(tx, dealId)
  }

  if (typeof db.$transaction === 'function') {
    return db.$transaction(run)
  }
  return run(db)
}

function isRazorpayDealPaymentsAvailable() {
  return Boolean(env.razorpayKeyId && env.razorpayKeySecret)
}

module.exports = {
  createDealPaymentOrder,
  verifyDealPayment,
  isRazorpayDealPaymentsAvailable,
  amountToPaise,
}
