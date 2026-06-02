'use strict'

/**
 * Auth API integration tests
 * ─────────────────────────────────────────────────────────────────────────────
 * Routes tested:
 *   POST  /api/auth/register
 *   POST  /api/auth/login
 *   GET   /api/auth/me
 *   POST  /api/auth/logout
 *
 * Prisma is mocked via src/config/__mocks__/database.js so no real DB is hit.
 */

jest.mock('../config/database')
jest.mock('../utils/audit')

const { agent, makeToken, makeUser, IDS } = require('./helpers')
const { prisma } = require('../config/database')
const { hashPassword } = require('../utils/password')

// ── Shared test user ──────────────────────────────────────────────────────────

// passwordHash is populated in beforeAll once bcrypt has run
let BUYER_PASSWORD_HASH

const BUYER = makeUser({
  id:          IDS.BUYER,
  email:       'buyer@example.com',
  role:        'BUYER',
  companyName: 'Acme Buyers Ltd',
})

beforeAll(async () => {
  BUYER_PASSWORD_HASH = await hashPassword('CorrectPassword1!')
})

beforeEach(() => {
  // Restore $transaction default behaviour after each reset
  prisma.$transaction.mockImplementation(async (fn) => fn(prisma))
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  test('201 – creates user and sets auth cookie', async () => {
    prisma.user.findUnique.mockResolvedValue(null)      // no existing user
    prisma.user.create.mockResolvedValue({
      id:          BUYER.id,
      email:       'new@example.com',
      role:        'BUYER',
      companyName: 'New Co',
      createdAt:   new Date(),
    })

    const res = await agent.post('/api/auth/register').send({
      email:       'new@example.com',
      password:    'StrongPass1!',
      role:        'BUYER',
      companyName: 'New Co',
    })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.user.email).toBe('new@example.com')
    expect(res.body.data.user.passwordHash).toBeUndefined()
    // Auth cookie must be present
    const setCookie = res.headers['set-cookie'] ?? []
    expect(setCookie.some((c) => c.startsWith('auth_token='))).toBe(true)
  })

  test('409 – duplicate email returns EMAIL_EXISTS', async () => {
    prisma.user.findUnique.mockResolvedValue(BUYER)

    const res = await agent.post('/api/auth/register').send({
      email:    'buyer@example.com',
      password: 'StrongPass1!',
      role:     'BUYER',
    })

    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('EMAIL_EXISTS')
  })

  test('400 – password too short (< 8 chars)', async () => {
    const res = await agent.post('/api/auth/register').send({
      email:    'x@example.com',
      password: 'short',
      role:     'BUYER',
    })

    expect(res.status).toBe(400)
  })

  test('400 – ADMIN role is not a valid registration role', async () => {
    const res = await agent.post('/api/auth/register').send({
      email:    'admin@example.com',
      password: 'ValidPass1!',
      role:     'ADMIN',
    })

    expect(res.status).toBe(400)
  })

  test('400 – missing email field', async () => {
    const res = await agent.post('/api/auth/register').send({
      password: 'ValidPass1!',
      role:     'SELLER',
    })

    expect(res.status).toBe(400)
  })

  test('400 – invalid email format', async () => {
    const res = await agent.post('/api/auth/register').send({
      email:    'not-an-email',
      password: 'ValidPass1!',
      role:     'BUYER',
    })

    expect(res.status).toBe(400)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  test('200 – valid credentials set auth cookie and return user', async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...BUYER,
      passwordHash: BUYER_PASSWORD_HASH,
    })

    const res = await agent.post('/api/auth/login').send({
      email:    'buyer@example.com',
      password: 'CorrectPassword1!',
    })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.user.email).toBe('buyer@example.com')
    const setCookie = res.headers['set-cookie'] ?? []
    expect(setCookie.some((c) => c.startsWith('auth_token='))).toBe(true)
    // Password hash must never appear in the response body
    expect(JSON.stringify(res.body)).not.toContain('passwordHash')
  })

  test('401 – unknown email returns INVALID_CREDENTIALS', async () => {
    prisma.user.findUnique.mockResolvedValue(null)

    const res = await agent.post('/api/auth/login').send({
      email:    'ghost@example.com',
      password: 'AnyPassword1!',
    })

    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS')
  })

  test('401 – correct email but wrong password', async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...BUYER,
      passwordHash: BUYER_PASSWORD_HASH,
    })

    const res = await agent.post('/api/auth/login').send({
      email:    'buyer@example.com',
      password: 'WrongPassword99!',
    })

    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS')
  })

  test('400 – missing password field', async () => {
    const res = await agent.post('/api/auth/login').send({
      email: 'buyer@example.com',
    })

    expect(res.status).toBe(400)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/auth/me', () => {
  test('200 – valid cookie returns authenticated user', async () => {
    prisma.user.findUnique.mockResolvedValue(BUYER)

    const token = makeToken({ id: BUYER.id, email: BUYER.email, role: BUYER.role })
    const res = await agent
      .get('/api/auth/me')
      .set('Cookie', `auth_token=${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.user.id).toBe(BUYER.id)
    expect(res.body.data.user.email).toBe(BUYER.email)
  })

  test('401 – no token returns UNAUTHORIZED', async () => {
    const res = await agent.get('/api/auth/me')

    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('UNAUTHORIZED')
  })

  test('401 – tampered / invalid token returns INVALID_TOKEN', async () => {
    const res = await agent
      .get('/api/auth/me')
      .set('Cookie', 'auth_token=not.a.valid.jwt')

    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('INVALID_TOKEN')
  })

  test('401 – valid token but user deleted from DB', async () => {
    prisma.user.findUnique.mockResolvedValue(null) // user no longer exists

    const token = makeToken({ id: 'deleted-user-id', email: 'gone@example.com', role: 'BUYER' })
    const res = await agent
      .get('/api/auth/me')
      .set('Cookie', `auth_token=${token}`)

    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('USER_NOT_FOUND')
  })

  test('401 – Authorization: Bearer header also accepted', async () => {
    prisma.user.findUnique.mockResolvedValue(BUYER)

    const token = makeToken({ id: BUYER.id, email: BUYER.email, role: BUYER.role })
    const res = await agent
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.user.id).toBe(BUYER.id)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
  test('200 – clears auth cookie (no auth required)', async () => {
    const res = await agent.post('/api/auth/logout')

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    // Set-Cookie should clear the cookie (Max-Age=0 or Expires in the past)
    const setCookie = (res.headers['set-cookie'] ?? []).join(';')
    expect(setCookie).toMatch(/auth_token=;/)
  })

  test('200 – logout succeeds even without a session cookie', async () => {
    const res = await agent.post('/api/auth/logout')

    expect(res.status).toBe(200)
  })
})
