'use strict'

/**
 * Subscription / Payment API integration tests
 * ─────────────────────────────────────────────────────────────────────────────
 * Routes tested:
 *   POST  /api/subscriptions/create-order
 *   POST  /api/subscriptions/verify
 *   GET   /api/subscriptions/status
 *
 * Prisma and Razorpay are both mocked — no real network calls are made.
 */

jest.mock('../config/database')
jest.mock('../utils/audit')

// Mock Razorpay constructor so no real API calls are made
jest.mock('razorpay', () => {
  const mockOrders = { create: jest.fn() }
  const RazorpayMock = jest.fn().mockImplementation(() => ({ orders: mockOrders }))
  RazorpayMock._mockOrders = mockOrders
  return RazorpayMock
})

const crypto = require('crypto')
const Razorpay = require('razorpay')

const { IDS, agent, makeToken, cookieFor, makeUser, makeSeller, makePayment, makeSubscription } = require('./helpers')
const { prisma } = require('../config/database')

// ── Shared users ──────────────────────────────────────────────────────────────

const BUYER  = makeUser()
const SELLER = makeSeller()
const ADMIN  = makeUser({ id: IDS.ADMIN, email: 'admin@test.com', role: 'ADMIN' })

const buyerToken  = makeToken({ id: BUYER.id,  email: BUYER.email,  role: 'BUYER'  })
const sellerToken = makeToken({ id: SELLER.id, email: SELLER.email, role: 'SELLER' })
const adminToken  = makeToken({ id: ADMIN.id,  email: ADMIN.email,  role: 'ADMIN'  })

// ── Razorpay signature helper ─────────────────────────────────────────────────

const TEST_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET // 'test_secret_TESTKEY'

function makeValidSignature(orderId, paymentId) {
  return crypto
    .createHmac('sha256', TEST_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex')
}

beforeEach(() => {
  prisma.$transaction.mockImplementation(async (fn) => fn(prisma))
  // Reset Razorpay mock between tests
  Razorpay._mockOrders.create.mockReset()
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/subscriptions/create-order
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/subscriptions/create-order', () => {
  const RZP_ORDER = { id: 'rzp_order_NEWONE', amount: 999900, currency: 'INR' }

  test('200 – BUYER creates an order for a buyer plan', async () => {
    prisma.user.findUnique.mockResolvedValue(BUYER)
    prisma.payment.findFirst.mockResolvedValue(null) // no recent pending
    Razorpay._mockOrders.create.mockResolvedValue(RZP_ORDER)
    prisma.payment.create.mockResolvedValue({})

    const res = await agent
      .post('/api/subscriptions/create-order')
      .set(cookieFor(buyerToken))
      .send({ plan: 'BUYER_STANDARD' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.razorpayOrderId).toBe('rzp_order_NEWONE')
    expect(res.body.data.amount).toBe(999900)
  })

  test('200 – SELLER creates an order for a seller plan', async () => {
    const sellerRzpOrder = { id: 'rzp_order_SELLER01', amount: 999900, currency: 'INR' }

    prisma.user.findUnique.mockResolvedValue(SELLER)
    prisma.payment.findFirst.mockResolvedValue(null)
    Razorpay._mockOrders.create.mockResolvedValue(sellerRzpOrder)
    prisma.payment.create.mockResolvedValue({})

    const res = await agent
      .post('/api/subscriptions/create-order')
      .set(cookieFor(sellerToken))
      .send({ plan: 'SELLER_MONTH' })

    expect(res.status).toBe(200)
    expect(res.body.data.razorpayOrderId).toBe('rzp_order_SELLER01')
  })

  test('200 – BUYER may purchase a seller plan (both-access checkout)', async () => {
    const sellerRzpOrder = { id: 'rzp_order_BOTH01', amount: 999900, currency: 'INR' }

    prisma.user.findUnique.mockResolvedValue(BUYER)
    prisma.payment.findFirst.mockResolvedValue(null)
    Razorpay._mockOrders.create.mockResolvedValue(sellerRzpOrder)
    prisma.payment.create.mockResolvedValue({})

    const res = await agent
      .post('/api/subscriptions/create-order')
      .set(cookieFor(buyerToken))
      .send({ plan: 'SELLER_MONTH' })

    expect(res.status).toBe(200)
    expect(res.body.data.razorpayOrderId).toBe('rzp_order_BOTH01')
  })

  test('200 – BUYER creates a combined BOTH bundle order', async () => {
    const bundleOrder = { id: 'rzp_order_BOTH01', amount: 1999800, currency: 'INR' }

    prisma.user.findUnique.mockResolvedValue(BUYER)
    prisma.payment.findFirst.mockResolvedValue(null)
    Razorpay._mockOrders.create.mockResolvedValue(bundleOrder)
    prisma.payment.create.mockResolvedValue({})

    const res = await agent
      .post('/api/subscriptions/create-order')
      .set(cookieFor(buyerToken))
      .send({ plan: 'BOTH_STANDARD_MONTH' })

    expect(res.status).toBe(200)
    expect(res.body.data.amount).toBe(1999800)
    expect(res.body.data.razorpayOrderId).toBe('rzp_order_BOTH01')
  })

  test('200 – SELLER may purchase a buyer plan (both-access checkout)', async () => {
    prisma.user.findUnique.mockResolvedValue(SELLER)
    prisma.payment.findFirst.mockResolvedValue(null)
    Razorpay._mockOrders.create.mockResolvedValue(RZP_ORDER)
    prisma.payment.create.mockResolvedValue({})

    const res = await agent
      .post('/api/subscriptions/create-order')
      .set(cookieFor(sellerToken))
      .send({ plan: 'BUYER_STANDARD' })

    expect(res.status).toBe(200)
    expect(res.body.data.razorpayOrderId).toBe('rzp_order_NEWONE')
  })

  test('400 – unknown plan name is rejected before reaching controller', async () => {
    prisma.user.findUnique.mockResolvedValue(BUYER)

    const res = await agent
      .post('/api/subscriptions/create-order')
      .set(cookieFor(buyerToken))
      .send({ plan: 'NONEXISTENT_PLAN' })

    // The Zod validator rejects unrecognised plans at the route level (VALIDATION_ERROR).
    // INVALID_PLAN would only be reached if the validator allowed an unknown value through.
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  test('200 – duplicate request within 15 min returns existing order (resumed: true)', async () => {
    const existingPending = makePayment({
      razorpayOrderId: 'rzp_order_EXISTING',
      amountPaise:     999900,
      currency:        'INR',
      status:          'PENDING',
    })

    prisma.user.findUnique.mockResolvedValue(BUYER)
    prisma.payment.findFirst.mockResolvedValue(existingPending) // duplicate found

    const res = await agent
      .post('/api/subscriptions/create-order')
      .set(cookieFor(buyerToken))
      .send({ plan: 'BUYER_STANDARD' })

    expect(res.status).toBe(200)
    expect(res.body.data.resumed).toBe(true)
    expect(res.body.data.razorpayOrderId).toBe('rzp_order_EXISTING')
    // Razorpay should NOT have been called for the duplicate
    expect(Razorpay._mockOrders.create).not.toHaveBeenCalled()
  })

  test('401 – unauthenticated request', async () => {
    const res = await agent
      .post('/api/subscriptions/create-order')
      .send({ plan: 'BUYER_STANDARD' })

    expect(res.status).toBe(401)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/subscriptions/verify
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/subscriptions/verify', () => {
  const RZP_ORDER_ID   = 'rzp_order_VERIFYME'
  const RZP_PAYMENT_ID = 'pay_TEST123456'
  const VALID_SIG      = makeValidSignature(RZP_ORDER_ID, RZP_PAYMENT_ID)

  const PENDING_PAYMENT = makePayment({
    razorpayOrderId: RZP_ORDER_ID,
    userId:          BUYER.id,
    status:          'PENDING',
  })

  const PAID_PAYMENT = {
    ...PENDING_PAYMENT,
    id:                'pay-uuid-001',
    status:            'PAID',
    subscriptionId:    'sub-uuid-001',
  }

  const ACTIVE_SUB = makeSubscription({ id: 'sub-uuid-001', plan: 'BUYER_STANDARD' })

  function verifyBody(sigOverride) {
    return {
      razorpayOrderId:   RZP_ORDER_ID,
      razorpayPaymentId: RZP_PAYMENT_ID,
      razorpaySignature: sigOverride ?? VALID_SIG,
    }
  }

  test('200 – valid signature activates subscription', async () => {
    let storedUser = {
      ...BUYER,
      buyerMarketplaceId: null,
      sellerMarketplaceId: null,
      buyerSubscriptionStatus: null,
      buyerSubscriptionPlan: null,
      sellerSubscriptionStatus: null,
      sellerSubscriptionPlan: null,
      buyerSubscriptionActivatedAt: null,
      sellerSubscriptionActivatedAt: null,
    }

    prisma.user.findUnique.mockImplementation(() => Promise.resolve(storedUser))
    prisma.user.findMany.mockResolvedValue([])
    prisma.marketplaceIdCounter.findUnique.mockResolvedValue(null)
    prisma.marketplaceIdCounter.upsert.mockImplementation(({ update }) => {
      if (update?.lastValue?.increment) {
        return Promise.resolve({ type: 'BUYER', lastValue: update.lastValue.increment })
      }
      return Promise.resolve({ type: 'BUYER', lastValue: 0 })
    })
    prisma.user.update.mockImplementation(({ data }) => {
      storedUser = { ...storedUser, ...data }
      return Promise.resolve(storedUser)
    })
    prisma.payment.findUnique
      .mockResolvedValueOnce({ userId: BUYER.id, status: 'PENDING' })
      .mockResolvedValueOnce(PENDING_PAYMENT)
    prisma.payment.updateMany.mockResolvedValue({ count: 0 })
    prisma.subscription.create.mockResolvedValue(ACTIVE_SUB)
    prisma.payment.update.mockResolvedValue({})

    const res = await agent
      .post('/api/subscriptions/verify')
      .set(cookieFor(buyerToken))
      .send(verifyBody())

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.subscription.plan).toBe('BUYER_STANDARD')
    expect(res.body.data.subscription.status).toBe('ACTIVE')
    expect(res.body.data.user?.buyerMarketplaceId).toBe('BUY-DEMO-000001')
    expect(res.body.data.alreadyPaid).toBeUndefined()
  })

  test('400 – tampered signature is rejected (INVALID_SIGNATURE)', async () => {
    prisma.user.findUnique.mockResolvedValue(BUYER)
    prisma.payment.findUnique.mockResolvedValue({ userId: BUYER.id, status: 'PENDING' })
    prisma.payment.updateMany.mockResolvedValue({ count: 1 })

    const res = await agent
      .post('/api/subscriptions/verify')
      .set(cookieFor(buyerToken))
      .send(verifyBody('bad-signature-tampered'))

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INVALID_SIGNATURE')
    // Payment must be marked FAILED on a bad-signature attempt
    expect(prisma.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'FAILED' } }),
    )
  })

  test('200 – idempotent retry returns existing subscription (alreadyPaid: true)', async () => {
    const userRecord = {
      ...BUYER,
      buyerMarketplaceId: 'BUY-DEMO-000001',
      sellerMarketplaceId: null,
      buyerSubscriptionStatus: 'ACTIVE',
      buyerSubscriptionPlan: 'BUYER_STANDARD',
      buyerSubscriptionActivatedAt: new Date(),
      sellerSubscriptionActivatedAt: null,
    }

    prisma.user.findUnique.mockResolvedValue(userRecord)
    prisma.user.update.mockResolvedValue(userRecord)
    prisma.payment.findUnique
      .mockResolvedValueOnce({ userId: BUYER.id, status: 'PAID' })
      .mockResolvedValueOnce(PAID_PAYMENT)
    prisma.subscription.findUnique.mockResolvedValue(ACTIVE_SUB)

    const res = await agent
      .post('/api/subscriptions/verify')
      .set(cookieFor(buyerToken))
      .send(verifyBody())

    expect(res.status).toBe(200)
    expect(res.body.data.alreadyPaid).toBe(true)
    expect(res.body.data.subscription.id).toBe(ACTIVE_SUB.id)
    expect(res.body.data.user?.buyerMarketplaceId).toBe('BUY-DEMO-000001')
    expect(prisma.subscription.create).not.toHaveBeenCalled()
    expect(prisma.marketplaceIdCounter.upsert).not.toHaveBeenCalled()
  })

  test('409 – verifying a FAILED payment returns PAYMENT_FAILED', async () => {
    const failedPayment = { ...PENDING_PAYMENT, status: 'FAILED', subscriptionId: null }

    prisma.user.findUnique.mockResolvedValue(BUYER)
    prisma.payment.findUnique
      .mockResolvedValueOnce({ userId: BUYER.id, status: 'FAILED' }) // pre-check
      .mockResolvedValueOnce(failedPayment)                           // inside tx

    const res = await agent
      .post('/api/subscriptions/verify')
      .set(cookieFor(buyerToken))
      .send(verifyBody())

    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('PAYMENT_FAILED')
  })

  test('404 – payment record does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(BUYER)
    prisma.payment.findUnique.mockResolvedValue(null)

    const res = await agent
      .post('/api/subscriptions/verify')
      .set(cookieFor(buyerToken))
      .send(verifyBody())

    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })

  test('403 – user trying to verify another user\'s payment', async () => {
    const otherBuyer = makeUser({ id: IDS.OTHER_BUYER, email: 'other@test.com' })
    const otherToken = makeToken({ id: otherBuyer.id, email: otherBuyer.email, role: 'BUYER' })

    prisma.user.findUnique.mockResolvedValue(otherBuyer)
    // payment.userId = BUYER.id, but the requester is otherBuyer
    prisma.payment.findUnique.mockResolvedValue({ userId: BUYER.id, status: 'PENDING' })

    const res = await agent
      .post('/api/subscriptions/verify')
      .set(cookieFor(otherToken))
      .send(verifyBody())

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  test('401 – unauthenticated verify request', async () => {
    const res = await agent.post('/api/subscriptions/verify').send(verifyBody())

    expect(res.status).toBe(401)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/subscriptions/status
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/subscriptions/status', () => {
  test('200 – returns active subscriptions for the authenticated user', async () => {
    const activeSub = makeSubscription({ plan: 'BUYER_STANDARD' })
    const userRecord = {
      ...BUYER,
      buyerMarketplaceId: 'BUY-DEMO-000001',
      sellerMarketplaceId: null,
      buyerSubscriptionStatus: 'ACTIVE',
      buyerSubscriptionPlan: 'BUYER_STANDARD',
      sellerSubscriptionStatus: null,
      sellerSubscriptionPlan: null,
      buyerSubscriptionActivatedAt: new Date(),
      sellerSubscriptionActivatedAt: null,
    }

    prisma.user.findUnique.mockResolvedValue(userRecord)
    prisma.subscription.findMany.mockResolvedValue([activeSub])
    prisma.subscription.updateMany.mockResolvedValue({ count: 0 })
    prisma.user.update.mockResolvedValue(userRecord)

    const res = await agent
      .get('/api/subscriptions/status')
      .set(cookieFor(buyerToken))

    expect(res.status).toBe(200)
    expect(res.body.data.hasBuyerSubscription).toBe(true)
    expect(res.body.data.buyerMarketplaceId).toBe('BUY-DEMO-000001')
    expect(res.body.data.buyerSubscription.marketplaceId).toBe('BUY-DEMO-000001')
    expect(res.body.data.subscriptions).toHaveLength(1)
  })

  test('200 – user with no subscriptions returns false flags', async () => {
    const userRecord = {
      ...BUYER,
      buyerMarketplaceId: null,
      sellerMarketplaceId: null,
      buyerSubscriptionStatus: null,
      buyerSubscriptionPlan: null,
      sellerSubscriptionStatus: null,
      sellerSubscriptionPlan: null,
      buyerSubscriptionActivatedAt: null,
      sellerSubscriptionActivatedAt: null,
    }

    prisma.user.findUnique.mockResolvedValue(userRecord)
    prisma.subscription.findMany.mockResolvedValue([])
    prisma.subscription.updateMany.mockResolvedValue({ count: 0 })

    const res = await agent
      .get('/api/subscriptions/status')
      .set(cookieFor(buyerToken))

    expect(res.status).toBe(200)
    expect(res.body.data.hasBuyerSubscription).toBe(false)
    expect(res.body.data.hasSellerSubscription).toBe(false)
    expect(res.body.data.buyerMarketplaceId).toBeNull()
    expect(res.body.data.sellerMarketplaceId).toBeNull()
  })

  test('401 – unauthenticated request', async () => {
    const res = await agent.get('/api/subscriptions/status')

    expect(res.status).toBe(401)
  })
})
