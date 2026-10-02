'use strict'

/**
 * Subscription authorization — HTTP → middleware → prisma boundaries.
 */

jest.mock('../config/database')
jest.mock('../utils/audit')

const { agent, cookieFor, makeToken, makeUser, makeSeller, IDS } = require('./helpers')
const { prisma } = require('../config/database')
const { hasActiveSubscription } = require('../middleware/requireSubscription.js')

const BUYER = makeUser()
const SELLER = makeSeller()
const OTHER_BUYER = makeUser({ id: IDS.OTHER_BUYER, email: 'other@test.com' })

const buyerToken = makeToken({ id: BUYER.id, email: BUYER.email, role: 'BUYER' })
const sellerToken = makeToken({ id: SELLER.id, email: SELLER.email, role: 'SELLER' })
const otherBuyerToken = makeToken({
  id: OTHER_BUYER.id,
  email: OTHER_BUYER.email,
  role: 'BUYER',
})

function authUserRecord(user) {
  return {
    ...user,
    isActive: true,
    portalUserId: null,
    buyerSubscriptionStatus: null,
    buyerSubscriptionPlan: null,
    sellerSubscriptionStatus: null,
    sellerSubscriptionPlan: null,
    buyerSubscriptionActivatedAt: null,
    sellerSubscriptionActivatedAt: null,
  }
}

function mockAuthUser(user) {
  prisma.user.findUnique.mockImplementation(async ({ where }) => {
    if (where.id === user.id) return authUserRecord(user)
    return null
  })
}

function mockActiveSubscription(active) {
  prisma.subscription.findFirst.mockResolvedValue(active ? { id: 'sub-active-1' } : null)
}

const minimalRfqBody = {
  productTitle: 'Steel rods',
  message: 'Need quote for project',
  deliveryLocation: 'Mumbai',
  expectedDeliveryDate: '2026-12-01',
  sellerIds: [IDS.SELLER],
}

beforeEach(() => {
  prisma.$transaction.mockImplementation(async (fn) => fn(prisma))
  jest.clearAllMocks()
})

describe('requireSubscription on protected routes', () => {
  test('A – active buyer subscription allows buyer RFQ create past subscription gate', async () => {
    mockAuthUser(BUYER)
    mockActiveSubscription(true)

    const res = await agent
      .post('/api/quote-requests')
      .set(cookieFor(buyerToken))
      .send(minimalRfqBody)

    expect(res.status).not.toBe(403)
    expect(res.body.error?.code).not.toBe('SUBSCRIPTION_REQUIRED')
  })

  test('B/N – expired/no subscription rejects POST /api/quote-requests with SUBSCRIPTION_REQUIRED', async () => {
    mockAuthUser(BUYER)
    mockActiveSubscription(false)

    const res = await agent
      .post('/api/quote-requests')
      .set(cookieFor(buyerToken))
      .send(minimalRfqBody)

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('SUBSCRIPTION_REQUIRED')
  })

  test('E – buyer-only subscription cannot pass seller publish gate', async () => {
    mockAuthUser(BUYER)
    prisma.subscription.findFirst.mockImplementation(async ({ where }) => {
      const sellerPlans = [
        'SELLER_MONTHLY',
        'SELLER_ANNUAL',
        'SELLER_LIFETIME',
        'BOTH_MONTHLY',
        'BOTH_ANNUAL',
        'BOTH_LIFETIME',
      ]
      const plans = where.plan?.in ?? []
      const wantsSeller = plans.some((p) => sellerPlans.includes(p))
      if (wantsSeller) return null
      return { id: 'sub-buyer-only' }
    })

    const res = await agent
      .post('/api/products')
      .set(cookieFor(buyerToken))
      .field('name', 'Test Product')
      .field('sku', 'SKU-001')
      .field('price', '100')
      .field('moq', '1')

    expect(res.status).toBe(403)
    expect(['SUBSCRIPTION_REQUIRED', 'FORBIDDEN']).toContain(res.body.error.code)
  })

  test('F – seller role without seller plan cannot create buyer RFQ', async () => {
    mockAuthUser(SELLER)
    mockActiveSubscription(false)

    const res = await agent
      .post('/api/quote-requests')
      .set(cookieFor(sellerToken))
      .send(minimalRfqBody)

    expect(res.status).toBe(403)
    expect(['SUBSCRIPTION_REQUIRED', 'FORBIDDEN']).toContain(res.body.error.code)
  })
})

describe('hasActiveSubscription expiry query', () => {
  test('treats missing/expired rows as inactive (ACTIVE + expiresAt filter)', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: 'BUYER', isActive: true })
    prisma.subscription.findFirst.mockResolvedValue(null)

    const ok = await hasActiveSubscription(BUYER.id, 'BUYER')

    expect(ok).toBe(false)
    expect(prisma.subscription.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: BUYER.id,
          status: 'ACTIVE',
          startsAt: { lte: expect.any(Date) },
          OR: [{ expiresAt: null }, { expiresAt: { gt: expect.any(Date) } }],
        }),
      }),
    )
  })

  test('ADMIN bypasses subscription lookup', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: 'ADMIN', isActive: true })

    const ok = await hasActiveSubscription(IDS.ADMIN, 'BUYER')

    expect(ok).toBe(true)
    expect(prisma.subscription.findFirst).not.toHaveBeenCalled()
  })
})

describe('GET /api/subscriptions/status ownership', () => {
  test('H – status is scoped to authenticated user only', async () => {
    mockAuthUser(BUYER)
    prisma.subscription.findMany.mockResolvedValue([])
    prisma.subscription.updateMany.mockResolvedValue({ count: 0 })
    prisma.user.findUnique.mockImplementation(async ({ where }) => {
      if (where.id === BUYER.id) return authUserRecord(BUYER)
      return null
    })
    prisma.user.update.mockResolvedValue(authUserRecord(BUYER))

    await agent.get('/api/subscriptions/status').set(cookieFor(buyerToken))

    expect(prisma.subscription.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: BUYER.id },
      }),
    )
    expect(prisma.subscription.findMany).not.toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: OTHER_BUYER.id },
      }),
    )
  })
})

describe('Payment verify ownership (regression)', () => {
  test('M – user cannot verify another user payment (FORBIDDEN)', async () => {
    mockAuthUser(OTHER_BUYER)
    prisma.payment.findUnique.mockResolvedValue({
      userId: BUYER.id,
      status: 'PENDING',
      amountPaise: 999900,
      currency: 'INR',
    })

    const res = await agent
      .post('/api/subscriptions/verify')
      .set(cookieFor(otherBuyerToken))
      .send({
        razorpayOrderId: 'rzp_order_OTHER',
        razorpayPaymentId: 'pay_OTHER',
        razorpaySignature: 'sig',
      })

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })
})
