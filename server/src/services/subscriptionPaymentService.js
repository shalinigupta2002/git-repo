'use strict'

const crypto = require('crypto')
const { prisma } = require('../config/database.js')
const { AppError } = require('../utils/AppError.js')
const env = require('../config/env.js')
const { grantsForPlan, isBundlePlan } = require('../config/subscriptionPlans.js')
const { syncSubscriptionFieldsForGrants } = require('../services/subscriptionSyncService.js')
const { serializeUser, USER_SELECT } = require('../utils/serializeUser.js')

function expiresAtFromDays(days) {
  if (!days) return null
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
}

async function createGrantsForPayment(tx, userId, paymentPlan) {
  const grants = grantsForPlan(paymentPlan)
  if (!grants?.length) {
    throw new AppError('Invalid plan', 400, 'INVALID_PLAN')
  }

  const now = new Date()
  const created = []
  for (const grant of grants) {
    const existing = await tx.subscription.findFirst({
      where: {
        userId,
        plan: grant.plan,
        status: 'ACTIVE',
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    })

    if (existing) {
      created.push(existing)
      continue
    }

    const sub = await tx.subscription.create({
      data: {
        userId,
        plan: grant.plan,
        status: 'ACTIVE',
        expiresAt: expiresAtFromDays(grant.expiresInDays),
      },
    })
    created.push(sub)
  }
  return created
}

async function loadSerializedUser(tx, userId) {
  const user = await tx.user.findUnique({ where: { id: userId }, select: USER_SELECT })
  return serializeUser(user)
}

async function applySubscriptionSync(tx, userId, subscriptions) {
  await syncSubscriptionFieldsForGrants(tx, userId, subscriptions)
  return loadSerializedUser(tx, userId)
}

async function finishPaidIdempotent(tx, payment, userId) {
  if (payment.subscriptionId) {
    const linked = await tx.subscription.findUnique({
      where: { id: payment.subscriptionId },
      select: {
        id: true,
        plan: true,
        status: true,
        startsAt: true,
        expiresAt: true,
      },
    })
    if (linked) {
      const user = await applySubscriptionSync(tx, userId, [linked])
      return {
        subscriptions: [linked],
        alreadyPaid: true,
        bundle: isBundlePlan(payment.plan),
        user,
      }
    }
  }

  const grantPlans = grantsForPlan(payment.plan).map((g) => g.plan)
  const existing = await tx.subscription.findMany({
    where: {
      userId,
      plan: { in: grantPlans },
      status: 'ACTIVE',
    },
    select: {
      id: true,
      plan: true,
      status: true,
      startsAt: true,
      expiresAt: true,
    },
  })
  if (existing.length) {
    const user = await applySubscriptionSync(tx, userId, existing)
    return {
      subscriptions: existing,
      alreadyPaid: true,
      bundle: isBundlePlan(payment.plan),
      user,
    }
  }

  const user = await loadSerializedUser(tx, userId)
  return {
    subscriptions: [],
    alreadyPaid: true,
    bundle: isBundlePlan(payment.plan),
    user,
  }
}

function verifyCheckoutSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
  const expectedSignature = crypto
    .createHmac('sha256', env.razorpayKeySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex')
  return expectedSignature === razorpaySignature
}

function verifyWebhookSignature(rawBody, signatureHeader) {
  if (!env.razorpayWebhookSecret) {
    throw new AppError('Webhook secret is not configured', 503, 'WEBHOOK_NOT_CONFIGURED')
  }
  if (!signatureHeader) {
    return false
  }
  const expected = crypto
    .createHmac('sha256', env.razorpayWebhookSecret)
    .update(rawBody)
    .digest('hex')
  return expected === signatureHeader
}

function normalizeCurrency(currency) {
  return String(currency ?? '')
    .trim()
    .toUpperCase()
}

/**
 * Compare Razorpay-reported capture (paise + currency) to server-side Payment row.
 */
function assertCaptureMatchesPayment(payment, reportedAmountPaise, reportedCurrency) {
  const expectedAmount = payment.amountPaise
  const expectedCurrency = normalizeCurrency(payment.currency)
  const capturedAmount = Number(reportedAmountPaise)
  const capturedCurrency = normalizeCurrency(reportedCurrency)

  if (!Number.isFinite(capturedAmount) || capturedAmount !== expectedAmount) {
    throw new AppError('Payment amount does not match order', 400, 'PAYMENT_AMOUNT_MISMATCH')
  }
  if (!capturedCurrency || capturedCurrency !== expectedCurrency) {
    throw new AppError('Payment currency does not match order', 400, 'PAYMENT_CURRENCY_MISMATCH')
  }
}

function getRazorpayClient() {
  if (!env.razorpayKeyId || !env.razorpayKeySecret) {
    throw new AppError(
      'Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env',
      503,
      'RAZORPAY_NOT_CONFIGURED',
    )
  }
  // eslint-disable-next-line global-require
  const Razorpay = require('razorpay')
  return new Razorpay({ key_id: env.razorpayKeyId, key_secret: env.razorpayKeySecret })
}

async function resolveReportedCaptureDetails({
  razorpayPaymentId,
  reportedAmountPaise,
  reportedCurrency,
}) {
  if (reportedAmountPaise != null && reportedCurrency != null) {
    return {
      amountPaise: Number(reportedAmountPaise),
      currency: reportedCurrency,
    }
  }

  const razorpay = getRazorpayClient()
  const rpPayment = await razorpay.payments.fetch(razorpayPaymentId)
  return {
    amountPaise: Number(rpPayment.amount),
    currency: rpPayment.currency,
  }
}

/**
 * Idempotent subscription activation for checkout verify + Razorpay webhooks.
 * @param {object} params
 * @param {string} params.razorpayOrderId
 * @param {string} params.razorpayPaymentId
 * @param {string} params.razorpaySignature
 * @param {string} [params.expectedUserId] When set, enforces payment ownership (client verify).
 * @param {number} [params.reportedAmountPaise] Razorpay capture amount (paise); from webhook when present.
 * @param {string} [params.reportedCurrency] Razorpay capture currency; from webhook when present.
 */
async function fulfillSubscriptionPayment({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  expectedUserId,
  reportedAmountPaise,
  reportedCurrency,
}) {
  const paymentCheck = await prisma.payment.findUnique({
    where: { razorpayOrderId },
    select: { userId: true, status: true, amountPaise: true, currency: true },
  })

  if (!paymentCheck) {
    throw new AppError('Payment record not found', 404, 'NOT_FOUND')
  }

  if (expectedUserId && paymentCheck.userId !== expectedUserId) {
    throw new AppError('Forbidden', 403, 'FORBIDDEN')
  }

  if (!verifyCheckoutSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
    await prisma.payment.updateMany({
      where: { razorpayOrderId, status: 'PENDING' },
      data: { status: 'FAILED' },
    })
    throw new AppError('Payment signature verification failed', 400, 'INVALID_SIGNATURE')
  }

  const userId = paymentCheck.userId

  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { razorpayOrderId },
      select: { id: true, status: true, plan: true, subscriptionId: true, amountPaise: true, currency: true },
    })

    if (payment.status === 'PAID') {
      return finishPaidIdempotent(tx, payment, userId)
    }

    if (payment.status === 'FAILED') {
      throw new AppError(
        'This payment was marked as failed. Please start a new subscription payment.',
        409,
        'PAYMENT_FAILED',
      )
    }

    const capture = await resolveReportedCaptureDetails({
      razorpayPaymentId,
      reportedAmountPaise,
      reportedCurrency,
    })
    assertCaptureMatchesPayment(payment, capture.amountPaise, capture.currency)

    let claim
    try {
      claim = await tx.payment.updateMany({
        where: { razorpayOrderId, status: 'PENDING' },
        data: {
          razorpayPaymentId,
          razorpaySignature,
          status: 'PAID',
          subscriptionId: null,
        },
      })
    } catch (err) {
      if (err.code === 'P2002') {
        throw new AppError('Payment already used for another order', 409, 'PAYMENT_ALREADY_USED')
      }
      throw err
    }

    if (claim.count === 0) {
      const current = await tx.payment.findUnique({
        where: { razorpayOrderId },
        select: {
          id: true,
          status: true,
          plan: true,
          subscriptionId: true,
          amountPaise: true,
          currency: true,
        },
      })
      if (current?.status === 'PAID') {
        return finishPaidIdempotent(tx, current, userId)
      }
      throw new AppError('Payment could not be claimed for fulfillment', 409, 'PAYMENT_CONFLICT')
    }

    let created
    try {
      created = await createGrantsForPayment(tx, userId, payment.plan)
      await tx.payment.update({
        where: { razorpayOrderId },
        data: { subscriptionId: created[0]?.id ?? null },
      })
    } catch (err) {
      await tx.payment.updateMany({
        where: { razorpayOrderId, status: 'PAID', subscriptionId: null },
        data: {
          status: 'PENDING',
          razorpayPaymentId: null,
          razorpaySignature: null,
        },
      })
      throw err
    }

    const user = await applySubscriptionSync(tx, userId, created)

    return {
      subscriptions: created,
      alreadyPaid: false,
      bundle: isBundlePlan(payment.plan),
      user,
    }
  })
}

function formatFulfillmentResponse({ subscriptions, alreadyPaid, bundle, user }) {
  return {
    subscription: subscriptions[0]
      ? {
          id: subscriptions[0].id,
          plan: subscriptions[0].plan,
          status: subscriptions[0].status,
          startsAt: subscriptions[0].startsAt,
          expiresAt: subscriptions[0].expiresAt,
        }
      : null,
    subscriptions: subscriptions.map((s) => ({
      id: s.id,
      plan: s.plan,
      status: s.status,
      startsAt: s.startsAt,
      expiresAt: s.expiresAt,
    })),
    bundle,
    user,
    ...(alreadyPaid ? { alreadyPaid: true } : {}),
  }
}

module.exports = {
  verifyCheckoutSignature,
  verifyWebhookSignature,
  fulfillSubscriptionPayment,
  formatFulfillmentResponse,
}
