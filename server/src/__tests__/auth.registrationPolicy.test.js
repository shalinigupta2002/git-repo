'use strict'

/**
 * Registration policy — ENABLE_PUBLIC_REGISTRATION / requirePublicRegistration.
 * Uses isolated env mocks; does not hit a real database.
 */

jest.mock('../config/database')
jest.mock('../utils/audit')

const supertest = require('supertest')
const { hashPassword } = require('../utils/password')

const IDS = {
  BUYER: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  OTHER_BUYER: '33333333-3333-4333-8333-333333333333',
}

function makeUser(overrides = {}) {
  return {
    id: IDS.BUYER,
    email: 'buyer@test.com',
    role: 'BUYER',
    companyName: 'Buyer Co',
    createdAt: new Date('2024-01-01'),
    portalUserId: null,
    buyerSubscriptionStatus: null,
    buyerSubscriptionPlan: null,
    buyerSubscriptionActivatedAt: null,
    sellerSubscriptionStatus: null,
    sellerSubscriptionPlan: null,
    sellerSubscriptionActivatedAt: null,
    isActive: true,
    deactivatedAt: null,
    ...overrides,
  }
}

let prisma

const BASE_ENV = {
  port: 3001,
  databaseUrl: 'postgresql://test',
  jwtSecret: process.env.JWT_SECRET || 'test-jwt-secret-at-least-32-characters-long!',
  jwtExpiresIn: '7d',
  cookieMaxAge: 604800000,
  corsAllowedOrigins: ['http://127.0.0.1:5173'],
  corsAllowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-CSRF-Token'],
  clientUrls: ['http://127.0.0.1:5173'],
  useCrossSiteCookies: false,
  razorpayKeyId: 'rzp_test_TESTID',
  razorpayKeySecret: 'test_secret',
  razorpayWebhookSecret: '',
  integrationApiEnabled: true,
  integrationAllowDevNegotiationStub: false,
  integrationNegotiationVerifyUrl: '',
  integrationS2sSharedSecret: '',
  csrfProtectionEnabled: false,
  sentryDsn: '',
  mainPortalProfileEnabled: false,
  allowDummyDealPayments: true,
}

function mockEnv(overrides) {
  jest.doMock('../config/env.js', () => ({
    nodeEnv: overrides.isProd ? 'production' : 'test',
    isProd: Boolean(overrides.isProd),
    isDev: !overrides.isProd,
    enablePublicRegistration: overrides.enablePublicRegistration,
    ...BASE_ENV,
    ...overrides,
  }))
}

function loadApp() {
  return require('../app')
}

const BUYER_EMAIL = 'new-reg@example.com'
const LOGIN_EMAIL = 'existing@example.com'
let passwordHash

beforeAll(async () => {
  passwordHash = await hashPassword('CorrectPassword1!')
})

beforeEach(() => {
  jest.resetModules()
  prisma = require('../config/database').prisma
  prisma.$transaction.mockImplementation(async (fn) => fn(prisma))
  jest.clearAllMocks()
})

describe('POST /api/auth/register — registration policy', () => {
  test('registration enabled → 201 creates user', async () => {
    mockEnv({ enablePublicRegistration: true, isProd: false })
    prisma.user.findUnique.mockResolvedValue(null)
    prisma.user.create.mockResolvedValue(
      makeUser({
        id: IDS.OTHER_BUYER,
        email: BUYER_EMAIL,
        role: 'BUYER',
        companyName: 'Co',
      }),
    )

    const res = await supertest(loadApp())
      .post('/api/auth/register')
      .send({
        email: BUYER_EMAIL,
        password: 'StrongPass1!',
        role: 'BUYER',
        companyName: 'Co',
      })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.user.email).toBe(BUYER_EMAIL)
  }, 15_000)

  test('registration disabled → 403 REGISTRATION_DISABLED', async () => {
    mockEnv({ enablePublicRegistration: false, isProd: true })
    prisma.user.findUnique.mockResolvedValue(null)

    const res = await supertest(loadApp())
      .post('/api/auth/register')
      .send({
        email: BUYER_EMAIL,
        password: 'StrongPass1!',
        role: 'SELLER',
      })

    expect(res.status).toBe(403)
    expect(res.body.success).toBe(false)
    expect(res.body.error.code).toBe('REGISTRATION_DISABLED')
    expect(res.body.error.message).toMatch(/not available/i)
    expect(res.body.error.message).not.toMatch(/password/i)
    expect(prisma.user.create).not.toHaveBeenCalled()
  })

  test('production default (flag unset) → registration rejected', () => {
    jest.isolateModules(() => {
      const prevNodeEnv = process.env.NODE_ENV
      const prevEnable = process.env.ENABLE_PUBLIC_REGISTRATION
      try {
        process.env.NODE_ENV = 'production'
        process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/app'
        process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-characters-long!'
        process.env.CLIENT_URL = 'https://app.example.com'
        process.env.RAZORPAY_KEY_ID = 'rzp_live_abc123'
        process.env.RAZORPAY_KEY_SECRET = 'live_secret_value'
        process.env.RAZORPAY_WEBHOOK_SECRET = 'webhook_secret_value'
        delete process.env.ENABLE_PUBLIC_REGISTRATION
        const env = require('../config/env.js')
        expect(env.enablePublicRegistration).toBe(false)
      } finally {
        process.env.NODE_ENV = prevNodeEnv
        if (prevEnable === undefined) delete process.env.ENABLE_PUBLIC_REGISTRATION
        else process.env.ENABLE_PUBLIC_REGISTRATION = prevEnable
      }
    })
  })

  test('login still works when registration is disabled', async () => {
    mockEnv({ enablePublicRegistration: false, isProd: true })
    prisma.user.findUnique.mockResolvedValue({
      ...makeUser({ id: IDS.BUYER, email: LOGIN_EMAIL, role: 'BUYER', companyName: 'Co' }),
      passwordHash,
    })

    const res = await supertest(loadApp())
      .post('/api/auth/login')
      .send({ email: LOGIN_EMAIL, password: 'CorrectPassword1!' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.user.email).toBe(LOGIN_EMAIL)
  })

  test('BUYER/SELLER validation unchanged when registration enabled', async () => {
    mockEnv({ enablePublicRegistration: true, isProd: false })

    const res = await supertest(loadApp())
      .post('/api/auth/register')
      .send({
        email: 'bad@example.com',
        password: 'StrongPass1!',
        role: 'ADMIN',
      })

    expect(res.status).toBe(400)
  })
})
