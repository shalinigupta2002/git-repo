const crypto = require('crypto')
const Razorpay = require('razorpay')
const { prisma } = require('../config/database.js')
const { AppError } = require('../utils/AppError.js')
const { asyncHandler } = require('../utils/asyncHandler.js')
const env = require('../config/env.js')

/** Amount in paise and expiry config per plan */
const PLAN_CONFIG = {
  BUYER_STANDARD:  { amountPaise: 499900,  expiresInDays: null, role: 'BUYER'  },
  BUYER_LIFETIME:  { amountPaise: 499900,  expiresInDays: null, role: 'BUYER'  },
  SELLER_MONTH:    { amountPaise: 199900,  expiresInDays: 30,   role: 'SELLER' },
  SELLER_LIFETIME: { amountPaise: 2999900, expiresInDays: null, role: 'SELLER' },
}

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

/** POST /api/subscriptions/create-order */
const createOrder = asyncHandler(async (req, res) => {
  const { plan } = req.body
  const userId   = req.user.id
  const userRole = req.user.role

  const config = PLAN_CONFIG[plan]
  if (!config) {
    throw new AppError('Invalid plan', 400, 'INVALID_PLAN')
  }

  // Enforce plan-role alignment: a BUYER must not purchase a SELLER plan
  // and vice versa. ADMINs are exempt so they can set up test subscriptions.
  if (userRole !== 'ADMIN' && config.role !== userRole) {
    throw new AppError(
      `${userRole.charAt(0) + userRole.slice(1).toLowerCase()}s may only subscribe to ` +
      `${config.role.charAt(0) + config.role.slice(1).toLowerCase()} plans. ` +
      `"${plan}" is a ${config.role.toLowerCase()} plan.`,
      403,
      'PLAN_ROLE_MISMATCH',
    )
  }

  // ── Duplicate-order prevention ───────────────────────────────────────────
  // If the client retries (network error, double-click) within the dedup
  // window, return the existing PENDING Razorpay order so the client can
  // resume the checkout without creating a second charge.
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
        resumed:         true, // signals the client that this is an existing order
      },
    })
  }

  // ── Create a fresh Razorpay order ────────────────────────────────────────
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

  // ── Fast pre-checks outside the transaction ──────────────────────────────
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

  // ── Verify HMAC signature before opening a DB transaction ────────────────
  // This avoids holding a transaction open while doing the crypto work, and
  // lets us fail fast without touching the DB further on a bad signature.
  const expectedSignature = crypto
    .createHmac('sha256', env.razorpayKeySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex')

  if (expectedSignature !== razorpaySignature) {
    // Only mark FAILED if the payment is still PENDING — never downgrade a
    // successfully paid record on a late bad-signature retry.
    await prisma.payment.updateMany({
      where: { razorpayOrderId, status: 'PENDING' },
      data:  { status: 'FAILED' },
    })
    throw new AppError('Payment signature verification failed', 400, 'INVALID_SIGNATURE')
  }

  // ── Atomic check-and-activate ────────────────────────────────────────────
  // The payment status re-read INSIDE the transaction acts as an optimistic
  // lock: if two verify requests race, one will find status='PAID' and return
  // the existing subscription (idempotent), while the other proceeds to create
  // it — rather than both creating duplicate subscriptions.
  const { sub, alreadyPaid } = await prisma.$transaction(async (tx) => {
    // Re-read payment inside the transaction for a race-safe status check
    const payment = await tx.payment.findUnique({
      where:  { razorpayOrderId },
      select: { id: true, status: true, plan: true, subscriptionId: true },
    })

    // ── Idempotent retry: payment was already successfully verified ─────────
    if (payment.status === 'PAID' && payment.subscriptionId) {
      const existingSub = await tx.subscription.findUnique({
        where:  { id: payment.subscriptionId },
        select: { id: true, plan: true, status: true, startsAt: true, expiresAt: true },
      })
      if (existingSub) return { sub: existingSub, alreadyPaid: true }
    }

    if (payment.status === 'FAILED') {
      throw new AppError(
        'This payment was marked as failed. Please start a new subscription payment.',
        409,
        'PAYMENT_FAILED',
      )
    }

    const plan   = payment.plan
    const config = PLAN_CONFIG[plan]

    const expiresAt = config.expiresInDays
      ? new Date(Date.now() + config.expiresInDays * 24 * 60 * 60 * 1000)
      : null

    const created = await tx.subscription.create({
      data: { userId, plan, status: 'ACTIVE', expiresAt },
    })

    await tx.payment.update({
      where: { razorpayOrderId },
      data: {
        razorpayPaymentId,
        razorpaySignature,
        status:         'PAID',
        subscriptionId: created.id,
      },
    })

    return { sub: created, alreadyPaid: false }
  })

  res.json({
    success: true,
    data: {
      subscription: {
        id:        sub.id,
        plan:      sub.plan,
        status:    sub.status,
        startsAt:  sub.startsAt,
        expiresAt: sub.expiresAt,
      },
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

  // Mark expired subscriptions automatically
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
