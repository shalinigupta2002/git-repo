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
const {
  syncSubscriptionFieldsForGrants,
  syncDenormalizedSubscriptionFields,
  hasEverActivatedBuyerSub,
  hasEverActivatedSellerSub,
} = require('../services/subscriptionSyncService.js')
const { serializeUser, USER_SELECT } = require('../utils/serializeUser.js')

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

async function loadSerializedUser(tx, userId) {
  const user = await tx.user.findUnique({ where: { id: userId }, select: USER_SELECT })
  return serializeUser(user)
}

async function applySubscriptionSync(tx, userId, subscriptions) {
  await syncSubscriptionFieldsForGrants(tx, userId, subscriptions)
  return loadSerializedUser(tx, userId)
}

function buildSubscriptionSummary(user, subscriptions, now) {
  const allBuyerSubs = subscriptions.filter(
    (s) => s.plan === 'BUYER_MONTHLY' || s.plan === 'BUYER_ANNUAL' || s.plan === 'BUYER_LIFETIME',
  )
  const allSellerSubs = subscriptions.filter(
    (s) => s.plan === 'SELLER_MONTHLY' || s.plan === 'SELLER_ANNUAL' || s.plan === 'SELLER_LIFETIME',
  )

  const latestBuyerSub = allBuyerSubs[0] ?? null
  const latestSellerSub = allSellerSubs[0] ?? null

  let buyerStatus = null
  let buyerPlan = null
  if (latestBuyerSub) {
    buyerPlan = latestBuyerSub.plan
    buyerStatus = (latestBuyerSub.expiresAt && latestBuyerSub.expiresAt <= now)
      ? 'EXPIRED'
      : latestBuyerSub.status
  } else if (user?.buyerSubscriptionPlan) {
    buyerPlan = user.buyerSubscriptionPlan
    buyerStatus = user.buyerSubscriptionStatus
  }

  let sellerStatus = null
  let sellerPlan = null
  if (latestSellerSub) {
    sellerPlan = latestSellerSub.plan
    sellerStatus = (latestSellerSub.expiresAt && latestSellerSub.expiresAt <= now)
      ? 'EXPIRED'
      : latestSellerSub.status
  } else if (user?.sellerSubscriptionPlan) {
    sellerPlan = user.sellerSubscriptionPlan
    sellerStatus = user.sellerSubscriptionStatus
  }

  const hasBuyerSub = buyerStatus === 'ACTIVE'
  const hasSellerSub = sellerStatus === 'ACTIVE'
  const portalUserId = user?.portalUserId ?? null

  return {
    hasBuyerSubscription: hasBuyerSub,
    hasSellerSubscription: hasSellerSub,
    portalUserId,
    buyerMarketplaceId: portalUserId,
    sellerMarketplaceId: portalUserId,
    buyerSubscription: {
      status: buyerStatus,
      plan: buyerPlan,
      portalUserId,
      marketplaceId: portalUserId,
    },
    sellerSubscription: {
      status: sellerStatus,
      plan: sellerPlan,
      portalUserId,
      marketplaceId: portalUserId,
    },
    buyerPlan,
    sellerPlan,
  }
}

/** POST /api/subscriptions/create-order */
const createOrder = asyncHandler(async (req, res) => {
  const { plan } = req.body
  const userId   = req.user.id

  const { resolveCanonicalPlanKey } = require('../services/subscriptionMasterService.js')
  const canonicalPlan = resolveCanonicalPlanKey(plan)

  const config = PLAN_CONFIG[canonicalPlan]
  if (!config) {
    throw new AppError('Invalid plan', 400, 'INVALID_PLAN')
  }

  const recentPending = await prisma.payment.findFirst({
    where: {
      userId,
      plan:      canonicalPlan,
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
    notes:    { plan: canonicalPlan, userId },
  })

  await prisma.payment.create({
    data: {
      userId,
      razorpayOrderId: rzpOrder.id,
      plan:            canonicalPlan,
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

  const { subscriptions, alreadyPaid, bundle, user } = await prisma.$transaction(async (tx) => {
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
          const serializedUser = await applySubscriptionSync(tx, userId, [linked])
          return {
            subscriptions: [linked],
            alreadyPaid:     true,
            bundle:          isBundlePlan(payment.plan),
            user: serializedUser,
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
        const serializedUser = await applySubscriptionSync(tx, userId, existing)
        return {
          subscriptions: existing,
          alreadyPaid:     true,
          bundle:          isBundlePlan(payment.plan),
          user: serializedUser,
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

    const serializedUser = await applySubscriptionSync(tx, userId, created)

    return {
      subscriptions: created,
      alreadyPaid:     false,
      bundle:        isBundlePlan(payment.plan),
      user: serializedUser,
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
      user,
      ...(alreadyPaid ? { alreadyPaid: true } : {}),
    },
  })
})

/** GET /api/subscriptions/status */
const getStatus = asyncHandler(async (req, res) => {
  const userId = req.user.id
  const now    = new Date()

  const subscriptions = await prisma.subscription.findMany({
    where: { userId },
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

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: USER_SELECT,
  })

  const summary = buildSubscriptionSummary(user, subscriptions, now)

  await syncDenormalizedSubscriptionFields(prisma, userId, {
    hasBuyerSub: summary.hasBuyerSubscription,
    hasSellerSub: summary.hasSellerSubscription,
    buyerPlan: summary.buyerPlan,
    sellerPlan: summary.sellerPlan,
  })

  const refreshedUser = await prisma.user.findUnique({
    where: { id: userId },
    select: USER_SELECT,
  })

  const refreshedSummary = buildSubscriptionSummary(refreshedUser, subscriptions, now)

  res.json({
    success: true,
    data: {
      hasSellerSubscription: refreshedSummary.hasSellerSubscription,
      hasBuyerSubscription:  refreshedSummary.hasBuyerSubscription,
      portalUserId:          refreshedSummary.portalUserId,
      buyerMarketplaceId:    refreshedSummary.buyerMarketplaceId,
      sellerMarketplaceId:   refreshedSummary.sellerMarketplaceId,
      buyerSubscription:     refreshedSummary.buyerSubscription,
      sellerSubscription:    refreshedSummary.sellerSubscription,
      subscriptions,
      user: serializeUser(refreshedUser),
    },
  })
})

module.exports = { createOrder, verifyPayment, getStatus, buildSubscriptionSummary }
