const crypto = require('crypto')
const Razorpay = require('razorpay')
const { prisma } = require('../config/database.js')
const { AppError } = require('../utils/AppError.js')
const { asyncHandler } = require('../utils/asyncHandler.js')
const env = require('../config/env.js')
const {
  PLAN_CONFIG,
  grantsForPlan,
  isBundlePlan,
} = require('../config/subscriptionPlans.js')

/** Window (ms) within which a PENDING payment is considered a duplicate */
const PENDING_DEDUP_WINDOW_MS = 15 * 60 * 1000 // 15 minutes

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
        plan:      grant.plan,
        status:    'ACTIVE',
        expiresAt: expiresAtFromDays(grant.expiresInDays),
      },
    })
    created.push(sub)
  }
  return created
}

/** POST /api/subscriptions/create-order */
const createOrder = asyncHandler(async (req, res) => {
  const { plan } = req.body
  const userId   = req.user.id

  const config = PLAN_CONFIG[plan]
  if (!config) {
    throw new AppError('Invalid plan', 400, 'INVALID_PLAN')
  }

  const recentPending = await prisma.payment.findFirst({
    where: {
      userId,
      plan,
      status:    'PENDING',
      createdAt: { gt: new Date(Date.now() - PENDING_DEDUP_WINDOW_MS) },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      razorpayOrderId: true,
      amountPaise:     true,
      currency:        true,
    },
  })

  if (recentPending) {
    return res.json({
      success: true,
      data: {
        razorpayOrderId: recentPending.razorpayOrderId,
        amount:          recentPending.amountPaise,
        currency:        recentPending.currency,
        keyId:           env.razorpayKeyId,
        resumed:         true,
      },
    })
  }

  const razorpay = getRazorpay()

  const rzpOrder = await razorpay.orders.create({
    amount:   config.amountPaise,
    currency: 'INR',
    receipt:  `sub_${userId.slice(0, 8)}_${Date.now()}`,
    notes:    { plan, userId },
  })

  await prisma.payment.create({
    data: {
      userId,
      razorpayOrderId: rzpOrder.id,
      plan,
      amountPaise: config.amountPaise,
      currency:    'INR',
      status:      'PENDING',
    },
  })

  res.json({
    success: true,
    data: {
      razorpayOrderId: rzpOrder.id,
      amount:          config.amountPaise,
      currency:        'INR',
      keyId:           env.razorpayKeyId,
    },
  })
})

/** POST /api/subscriptions/verify */
const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body
  const userId = req.user.id

  const paymentCheck = await prisma.payment.findUnique({
    where:  { razorpayOrderId },
    select: { userId: true, status: true },
  })
  if (!paymentCheck) {
    throw new AppError('Payment record not found', 404, 'NOT_FOUND')
  }
  if (paymentCheck.userId !== userId) {
    throw new AppError('Forbidden', 403, 'FORBIDDEN')
  }

  const expectedSignature = crypto
    .createHmac('sha256', env.razorpayKeySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex')

  if (expectedSignature !== razorpaySignature) {
    await prisma.payment.updateMany({
      where: { razorpayOrderId, status: 'PENDING' },
      data:  { status: 'FAILED' },
    })
    throw new AppError('Payment signature verification failed', 400, 'INVALID_SIGNATURE')
  }

  const { subscriptions, alreadyPaid, bundle } = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where:  { razorpayOrderId },
      select: { id: true, status: true, plan: true, subscriptionId: true },
    })

    if (payment.status === 'PAID') {
      if (payment.subscriptionId) {
        const linked = await tx.subscription.findUnique({
          where:  { id: payment.subscriptionId },
          select: {
            id: true,
            plan: true,
            status: true,
            startsAt: true,
            expiresAt: true,
          },
        })
        if (linked) {
          return {
            subscriptions: [linked],
            alreadyPaid:     true,
            bundle:          isBundlePlan(payment.plan),
          }
        }
      }

      const grantPlans = grantsForPlan(payment.plan).map((g) => g.plan)
      const existing = await tx.subscription.findMany({
        where: {
          userId,
          plan:   { in: grantPlans },
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
        return {
          subscriptions: existing,
          alreadyPaid:     true,
          bundle:          isBundlePlan(payment.plan),
        }
      }
    }

    if (payment.status === 'FAILED') {
      throw new AppError(
        'This payment was marked as failed. Please start a new subscription payment.',
        409,
        'PAYMENT_FAILED',
      )
    }

    const created = await createGrantsForPayment(tx, userId, payment.plan)

    await tx.payment.update({
      where: { razorpayOrderId },
      data: {
        razorpayPaymentId,
        razorpaySignature,
        status:         'PAID',
        subscriptionId: created[0]?.id ?? null,
      },
    })

    return {
      subscriptions: created,
      alreadyPaid:     false,
      bundle:        isBundlePlan(payment.plan),
    }
  })

  res.json({
    success: true,
    data: {
      subscription:  subscriptions[0]
        ? {
            id:        subscriptions[0].id,
            plan:      subscriptions[0].plan,
            status:    subscriptions[0].status,
            startsAt:  subscriptions[0].startsAt,
            expiresAt: subscriptions[0].expiresAt,
          }
        : null,
      subscriptions: subscriptions.map((s) => ({
        id:        s.id,
        plan:      s.plan,
        status:    s.status,
        startsAt:  s.startsAt,
        expiresAt: s.expiresAt,
      })),
      bundle,
      ...(alreadyPaid ? { alreadyPaid: true } : {}),
    },
  })
})

/** GET /api/subscriptions/status */
const getStatus = asyncHandler(async (req, res) => {
  const userId = req.user.id
  const now    = new Date()

  const subscriptions = await prisma.subscription.findMany({
    where: {
      userId,
      status: 'ACTIVE',
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id:        true,
      plan:      true,
      status:    true,
      startsAt:  true,
      expiresAt: true,
    },
  })

  await prisma.subscription.updateMany({
    where: {
      userId,
      status:    'ACTIVE',
      expiresAt: { lte: now },
    },
    data: { status: 'EXPIRED' },
  })

  const hasSellerSub = subscriptions.some(
    (s) => s.plan === 'SELLER_MONTH' || s.plan === 'SELLER_LIFETIME',
  )
  const hasBuyerSub = subscriptions.some(
    (s) => s.plan === 'BUYER_STANDARD' || s.plan === 'BUYER_LIFETIME',
  )

  res.json({
    success: true,
    data: {
      hasSellerSubscription: hasSellerSub,
      hasBuyerSubscription:  hasBuyerSub,
      subscriptions,
    },
  })
})

module.exports = { createOrder, verifyPayment, getStatus }
