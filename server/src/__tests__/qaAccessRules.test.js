'use strict'

// Mock the database client to verify behavior
jest.mock('../config/database')
jest.mock('../utils/audit')

const { agent, cookieFor, makeToken, IDS } = require('./helpers')
const { prisma } = require('../config/database')

const emailMonthly = 'qa-both-monthly@b2b-qa.test'
const emailAnnual = 'qa-both-annual@b2b-qa.test'
const emailLifetime = 'qa-both-lifetime@b2b-qa.test'
const emailNone = 'qa-no-subscription@b2b-qa.test'

const userMonthlyToken = makeToken({ id: 'monthly-user-id', email: emailMonthly, role: 'BUYER' })
const userAnnualToken = makeToken({ id: 'annual-user-id', email: emailAnnual, role: 'BUYER' })
const userLifetimeToken = makeToken({ id: 'lifetime-user-id', email: emailLifetime, role: 'BUYER' })
const userNoneToken = makeToken({ id: 'none-user-id', email: emailNone, role: 'BUYER' })

const userMonthlyRecord = {
  id: 'monthly-user-id',
  email: emailMonthly,
  role: 'BUYER',
  buyerSubscriptionPlan: 'BUYER_MONTHLY',
  buyerSubscriptionStatus: 'ACTIVE',
  buyerSubscriptionActivatedAt: new Date('2026-06-25T15:00:00+05:30'),
  sellerSubscriptionPlan: 'SELLER_MONTHLY',
  sellerSubscriptionStatus: 'ACTIVE',
  sellerSubscriptionActivatedAt: new Date('2026-06-25T15:00:00+05:30'),
}

const userAnnualRecord = {
  id: 'annual-user-id',
  email: emailAnnual,
  role: 'BUYER',
  buyerSubscriptionPlan: 'BUYER_ANNUAL',
  buyerSubscriptionStatus: 'ACTIVE',
  buyerSubscriptionActivatedAt: new Date(),
  sellerSubscriptionPlan: 'SELLER_ANNUAL',
  sellerSubscriptionStatus: 'ACTIVE',
  sellerSubscriptionActivatedAt: new Date(),
}

const userLifetimeRecord = {
  id: 'lifetime-user-id',
  email: emailLifetime,
  role: 'BUYER',
  buyerSubscriptionPlan: 'BUYER_LIFETIME',
  buyerSubscriptionStatus: 'ACTIVE',
  buyerSubscriptionActivatedAt: new Date(),
  sellerSubscriptionPlan: 'SELLER_LIFETIME',
  sellerSubscriptionStatus: 'ACTIVE',
  sellerSubscriptionActivatedAt: new Date(),
}

const userNoneRecord = {
  id: 'none-user-id',
  email: emailNone,
  role: 'BUYER',
  buyerSubscriptionPlan: null,
  buyerSubscriptionStatus: null,
  buyerSubscriptionActivatedAt: null,
  sellerSubscriptionPlan: null,
  sellerSubscriptionStatus: null,
  sellerSubscriptionActivatedAt: null,
}

describe('QA Access Rules & User Capabilities Validation', () => {
  beforeEach(() => {
    prisma.$transaction.mockImplementation(async (fn) => fn(prisma))
  })

  // 1. Both Annual has access to both workspaces
  test('BOTH_ANNUAL user can access status endpoint with active flags for both', async () => {
    const expireAnnual = new Date()
    expireAnnual.setDate(expireAnnual.getDate() + 365)

    const subs = [
      { id: 'sub-b', plan: 'BUYER_ANNUAL', status: 'ACTIVE', startsAt: new Date(), expiresAt: expireAnnual },
      { id: 'sub-s', plan: 'SELLER_ANNUAL', status: 'ACTIVE', startsAt: new Date(), expiresAt: expireAnnual },
    ]

    prisma.user.findUnique.mockResolvedValue(userAnnualRecord)
    prisma.subscription.findMany.mockResolvedValue(subs)

    const res = await agent
      .get('/api/subscriptions/status')
      .set(cookieFor(userAnnualToken))

    expect(res.status).toBe(200)
    expect(res.body.data.hasBuyerSubscription).toBe(true)
    expect(res.body.data.hasSellerSubscription).toBe(true)
    expect(res.body.data.buyerSubscription.status).toBe('ACTIVE')
    expect(res.body.data.sellerSubscription.status).toBe('ACTIVE')
  })

  // 2. Both Lifetime never expires
  test('BOTH_LIFETIME user has active flags and no expiry date', async () => {
    const subs = [
      { id: 'sub-b-life', plan: 'BUYER_LIFETIME', status: 'ACTIVE', startsAt: new Date(), expiresAt: null },
      { id: 'sub-s-life', plan: 'SELLER_LIFETIME', status: 'ACTIVE', startsAt: new Date(), expiresAt: null },
    ]

    prisma.user.findUnique.mockResolvedValue(userLifetimeRecord)
    prisma.subscription.findMany.mockResolvedValue(subs)

    const res = await agent
      .get('/api/subscriptions/status')
      .set(cookieFor(userLifetimeToken))

    expect(res.status).toBe(200)
    expect(res.body.data.hasBuyerSubscription).toBe(true)
    expect(res.body.data.hasSellerSubscription).toBe(true)
    expect(res.body.data.buyerSubscription.plan).toBe('BUYER_LIFETIME')
    expect(res.body.data.sellerSubscription.plan).toBe('SELLER_LIFETIME')
  })

  // 3. User with NO subscription has no active flags
  test('NO_SUBSCRIPTION user has no active flags and null subscription objects', async () => {
    prisma.user.findUnique.mockResolvedValue(userNoneRecord)
    prisma.subscription.findMany.mockResolvedValue([])

    const res = await agent
      .get('/api/subscriptions/status')
      .set(cookieFor(userNoneToken))

    expect(res.status).toBe(200)
    expect(res.body.data.hasBuyerSubscription).toBe(false)
    expect(res.body.data.hasSellerSubscription).toBe(false)
    expect(res.body.data.buyerSubscription.status).toBeNull()
    expect(res.body.data.sellerSubscription.status).toBeNull()
  })

  // 4. BOTH_MONTHLY automatic expiry at 3:00 PM today
  describe('BOTH_MONTHLY expiry validation', () => {
    const startMonthly = new Date('2026-06-25T15:00:00+05:30')
    const expireMonthly = new Date('2026-07-23T15:00:00+05:30') // today at 3:00 PM

    const subs = [
      { id: 'sub-b-m', plan: 'BUYER_MONTHLY', status: 'ACTIVE', startsAt: startMonthly, expiresAt: expireMonthly },
      { id: 'sub-s-m', plan: 'SELLER_MONTHLY', status: 'ACTIVE', startsAt: startMonthly, expiresAt: expireMonthly },
    ]

    test('Before 3:00 PM today: active subscription access is granted', async () => {
      // Mock system time to 2:50 PM local time today (July 23, 2026)
      const mockTimeBefore = new Date('2026-07-23T14:50:00+05:30')
      jest.useFakeTimers().setSystemTime(mockTimeBefore)

      prisma.user.findUnique.mockResolvedValue(userMonthlyRecord)
      prisma.subscription.findMany.mockResolvedValue(subs)

      const res = await agent
        .get('/api/subscriptions/status')
        .set(cookieFor(userMonthlyToken))

      expect(res.status).toBe(200)
      expect(res.body.data.hasBuyerSubscription).toBe(true)
      expect(res.body.data.hasSellerSubscription).toBe(true)
      expect(res.body.data.buyerSubscription.status).toBe('ACTIVE')
      expect(res.body.data.sellerSubscription.status).toBe('ACTIVE')

      jest.useRealTimers()
    })

    test('After 3:00 PM today: subscription is expired', async () => {
      // Mock system time to 3:10 PM local time today (July 23, 2026)
      const mockTimeAfter = new Date('2026-07-23T15:10:00+05:30')
      jest.useFakeTimers().setSystemTime(mockTimeAfter)

      prisma.user.findUnique.mockResolvedValue(userMonthlyRecord)
      prisma.subscription.findMany.mockResolvedValue(subs)

      const res = await agent
        .get('/api/subscriptions/status')
        .set(cookieFor(userMonthlyToken))

      expect(res.status).toBe(200)
      expect(res.body.data.hasBuyerSubscription).toBe(false)
      expect(res.body.data.hasSellerSubscription).toBe(false)
      expect(res.body.data.buyerSubscription.status).toBe('EXPIRED')
      expect(res.body.data.sellerSubscription.status).toBe('EXPIRED')

      jest.useRealTimers()
    })
  })
})
