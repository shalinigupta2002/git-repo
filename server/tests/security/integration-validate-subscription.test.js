'use strict'

jest.mock('../../src/config/database')

const { agent, cookieFor, makeToken, makeUser, IDS } = require('../../src/__tests__/helpers')
const { prisma } = require('../../src/config/database')

const USER_A = makeUser({ id: IDS.BUYER, email: 'a@test.com', role: 'BUYER' })
const USER_B = makeUser({ id: IDS.OTHER_BUYER, email: 'b@test.com', role: 'BUYER' })

const tokenA = makeToken({ id: USER_A.id, email: USER_A.email, role: 'BUYER' })
const adminToken = makeToken({ id: IDS.ADMIN, email: 'admin@test.com', role: 'ADMIN' })

const userBRecord = {
  id: USER_B.id,
  email: USER_B.email,
  role: 'BUYER',
  buyerSubscriptionStatus: 'ACTIVE',
  buyerSubscriptionPlan: 'BUYER_ANNUAL',
  buyerSubscriptionActivatedAt: new Date(),
  sellerSubscriptionStatus: 'INACTIVE',
  sellerSubscriptionPlan: null,
  sellerSubscriptionActivatedAt: null,
  subscriptions: [
    {
      id: 'sub-b-private',
      plan: 'BUYER_ANNUAL',
      status: 'ACTIVE',
      startsAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
    },
  ],
}

function mockAuthLookup() {
  prisma.user.findUnique.mockImplementation(async ({ where, include }) => {
    if (where.id === USER_A.id) {
      return { ...USER_A, isActive: true }
    }
    if (where.id === USER_B.id) {
      if (include?.subscriptions) return userBRecord
      return { ...USER_B, isActive: true }
    }
    if (where.id === IDS.ADMIN) {
      return { id: IDS.ADMIN, email: 'admin@test.com', role: 'ADMIN', isActive: true }
    }
    return null
  })
}

describe('Integration POST /subscriptions/validate — IDOR boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuthLookup()
  })

  test('I – User A cannot validate User B subscription (403 FORBIDDEN)', async () => {
    const res = await agent
      .post('/api/v1/integrations/subscriptions/validate')
      .set(cookieFor(tokenA))
      .send({ userId: USER_B.id, requiredType: 'BUYER' })

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
    expect(res.body.data).toBeUndefined()
  })

  test('User A validating self returns own subscription data only', async () => {
    prisma.user.findUnique.mockImplementation(async ({ where, include }) => {
      if (where.id === USER_A.id) {
        if (include?.subscriptions) {
          return {
            ...USER_A,
            buyerSubscriptionStatus: 'INACTIVE',
            buyerSubscriptionPlan: null,
            buyerSubscriptionActivatedAt: null,
            sellerSubscriptionStatus: 'INACTIVE',
            sellerSubscriptionPlan: null,
            sellerSubscriptionActivatedAt: null,
            subscriptions: [],
          }
        }
        return { ...USER_A, isActive: true }
      }
      return null
    })

    const res = await agent
      .post('/api/v1/integrations/subscriptions/validate')
      .set(cookieFor(tokenA))
      .send({ userId: USER_A.id, requiredType: 'BUYER' })

    expect(res.status).toBe(200)
    expect(res.body.data.userId).toBe(USER_A.id)
    expect(res.body.data.buyerSubscription.status).toBe('INACTIVE')
  })

  test('L – ADMIN may validate another user subscription', async () => {
    const res = await agent
      .post('/api/v1/integrations/subscriptions/validate')
      .set(cookieFor(adminToken))
      .send({ userId: USER_B.id, requiredType: 'BUYER' })

    expect(res.status).toBe(200)
    expect(res.body.data.userId).toBe(USER_B.id)
    expect(res.body.data.buyerSubscription.status).toBe('ACTIVE')
    expect(res.body.data.buyerSubscription.plan).toBe('BUYER_ANNUAL')
  })

  test('User B subscription data not returned to User A on forbidden attempt', async () => {
    const res = await agent
      .post('/api/v1/integrations/subscriptions/validate')
      .set(cookieFor(tokenA))
      .send({ userId: USER_B.id, requiredType: 'ANY' })

    expect(res.status).toBe(403)
    const body = JSON.stringify(res.body)
    expect(body).not.toContain('BUYER_ANNUAL')
    expect(body).not.toContain('sub-b-private')
  })
})

describe('Integration API production defaults (regression)', () => {
  test('J – production loads with integration API disabled by default', () => {
    jest.isolateModules(() => {
      const prev = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/app'
      process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-characters-long!'
      process.env.CLIENT_URL = 'https://app.example.com'
      process.env.RAZORPAY_KEY_ID = 'rzp_live_abc123'
      process.env.RAZORPAY_KEY_SECRET = 'live_secret_value'
      process.env.RAZORPAY_WEBHOOK_SECRET = 'webhook_secret_value'
      delete process.env.INTEGRATION_API_ENABLED

      const env = require('../../src/config/env.js')
      expect(env.integrationApiEnabled).toBe(false)

      process.env.NODE_ENV = prev
    })
  })
})
