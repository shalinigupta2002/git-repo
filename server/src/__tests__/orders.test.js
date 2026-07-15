'use strict'

/**
 * Order API integration tests
 * ─────────────────────────────────────────────────────────────────────────────
 * Routes tested:
 *   POST   /api/orders
 *   GET    /api/orders
 *   GET    /api/orders/:id
 *   GET    /api/orders/:id/history
 *   PATCH  /api/orders/:id/status
 *
 * Prisma and audit logging are mocked — no real DB is hit.
 */

jest.mock('../config/database')
jest.mock('../utils/audit')

const { IDS, agent, makeToken, cookieFor, makeUser, makeSeller, makeProduct, makeOrder } = require('./helpers')
const { prisma } = require('../config/database')

// ── Shared users ──────────────────────────────────────────────────────────────

const BUYER  = makeUser()
const SELLER = makeSeller()
const ADMIN  = makeUser({ id: IDS.ADMIN, email: 'admin@test.com', role: 'ADMIN' })

// ── Tokens ────────────────────────────────────────────────────────────────────

const buyerToken  = makeToken({ id: BUYER.id,  email: BUYER.email,  role: 'BUYER'  })
const sellerToken = makeToken({ id: SELLER.id, email: SELLER.email, role: 'SELLER' })
const adminToken  = makeToken({ id: ADMIN.id,  email: ADMIN.email,  role: 'ADMIN'  })

// ── Shared product / order fixtures ──────────────────────────────────────────

const PRODUCT = makeProduct()
const ORDER   = makeOrder()

beforeEach(() => {
  // Restore $transaction default so each test controls its own stubs
  prisma.$transaction.mockImplementation(async (fn) => fn(prisma))
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/orders — direct creation disabled (deals created via quotation accept)
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/orders', () => {
  test('404 – direct buyer order creation is not supported', async () => {
    const res = await agent
      .post('/api/orders')
      .set(cookieFor(buyerToken))
      .send({ items: [{ productId: PRODUCT.id, quantity: 5 }] })

    expect(res.status).toBe(404)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/orders
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/orders', () => {
  test('200 – BUYER sees their own orders', async () => {
    prisma.user.findUnique.mockResolvedValue(BUYER)
    prisma.order.findMany.mockResolvedValue([ORDER])
    prisma.order.count.mockResolvedValue(1)

    const res = await agent
      .get('/api/orders')
      .set(cookieFor(buyerToken))

    expect(res.status).toBe(200)
    expect(res.body.data.orders).toHaveLength(1)
    expect(res.body.data.pagination.total).toBe(1)
  })

  test('401 – unauthenticated request', async () => {
    const res = await agent.get('/api/orders')

    expect(res.status).toBe(401)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/orders/:id
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/orders/:id', () => {
  test('200 – buyer owner can read their order', async () => {
    prisma.user.findUnique.mockResolvedValue(BUYER)
    prisma.order.findUnique.mockResolvedValue(ORDER)

    const res = await agent
      .get(`/api/orders/${ORDER.id}`)
      .set(cookieFor(buyerToken))

    expect(res.status).toBe(200)
    expect(res.body.data.order.id).toBe(ORDER.id)
  })

  test('200 – seller who owns the order can read it', async () => {
    prisma.user.findUnique.mockResolvedValue(SELLER)
    prisma.order.findUnique.mockResolvedValue(ORDER)

    const res = await agent
      .get(`/api/orders/${ORDER.id}`)
      .set(cookieFor(sellerToken))

    expect(res.status).toBe(200)
  })

  test('404 – order not found', async () => {
    prisma.user.findUnique.mockResolvedValue(BUYER)
    prisma.order.findUnique.mockResolvedValue(null)

    const res = await agent
      .get(`/api/orders/${IDS.NOT_FOUND}`)
      .set(cookieFor(buyerToken))

    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })

  test('403 – buyer who does not own the order is rejected', async () => {
    const otherBuyer = makeUser({ id: IDS.OTHER_BUYER, email: 'other@test.com' })
    const otherToken = makeToken({ id: otherBuyer.id, email: otherBuyer.email, role: 'BUYER' })

    prisma.user.findUnique.mockResolvedValue(otherBuyer)
    // ORDER.buyerId = 'user-buyer-uuid', but this user's id is 'other-buyer-uuid'
    prisma.order.findUnique.mockResolvedValue(ORDER)

    const res = await agent
      .get(`/api/orders/${ORDER.id}`)
      .set(cookieFor(otherToken))

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/orders/:id/history
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/orders/:id/history', () => {
  test('200 – returns history entries for order owner', async () => {
    const historyEntry = {
      id:         'hist-001',
      fromStatus: null,
      toStatus:   'PENDING',
      note:       'Order created',
      createdAt:  new Date(),
      changedBy:  { id: BUYER.id, email: BUYER.email, companyName: BUYER.companyName },
    }

    prisma.user.findUnique.mockResolvedValue(BUYER)
    prisma.order.findUnique.mockResolvedValue({
      buyerId:  BUYER.id,
      sellerId: SELLER.id,
    })
    prisma.orderHistory.findMany.mockResolvedValue([historyEntry])

    const res = await agent
      .get(`/api/orders/${ORDER.id}/history`)
      .set(cookieFor(buyerToken))

    expect(res.status).toBe(200)
    expect(res.body.data.history).toHaveLength(1)
    expect(res.body.data.history[0].toStatus).toBe('PENDING')
  })

  test('403 – unrelated user cannot read history', async () => {
    const stranger = makeUser({ id: IDS.STRANGER, email: 'stranger@test.com' })
    const strangerToken = makeToken({ id: stranger.id, email: stranger.email, role: 'BUYER' })

    prisma.user.findUnique.mockResolvedValue(stranger)
    prisma.order.findUnique.mockResolvedValue({
      buyerId:  BUYER.id,  // not stranger
      sellerId: SELLER.id, // not stranger
    })

    const res = await agent
      .get(`/api/orders/${ORDER.id}/history`)
      .set(cookieFor(strangerToken))

    expect(res.status).toBe(403)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/orders/:id/status
// ─────────────────────────────────────────────────────────────────────────────

describe('PATCH /api/orders/:id/status', () => {
  const PENDING_ORDER = makeOrder({ status: 'PENDING', sellerId: SELLER.id })
  const DELIVERED_ORDER = makeOrder({ status: 'DELIVERED', sellerId: SELLER.id })

  test('200 – SELLER transitions PENDING → CONFIRMED', async () => {
    const confirmedOrder = makeOrder({ status: 'CONFIRMED', sellerId: SELLER.id })

    prisma.user.findUnique.mockResolvedValue(SELLER)
    prisma.order.findUnique
      .mockResolvedValueOnce({ id: ORDER.id, status: 'PENDING', sellerId: SELLER.id }) // pre-check
      .mockResolvedValueOnce(confirmedOrder) // final findUnique inside tx
    prisma.order.updateMany.mockResolvedValue({ count: 1 })
    prisma.orderHistory.create.mockResolvedValue({})
    prisma.orderItem.findMany.mockResolvedValue([])
    prisma.product.findMany.mockResolvedValue([])

    const res = await agent
      .patch(`/api/orders/${ORDER.id}/status`)
      .set(cookieFor(sellerToken))
      .send({ status: 'CONFIRMED' })

    expect(res.status).toBe(200)
    expect(res.body.data.order.status).toBe('CONFIRMED')
  })

  test('409 – invalid status transition (DELIVERED → CANCELLED)', async () => {
    prisma.user.findUnique.mockResolvedValue(SELLER)
    prisma.order.findUnique.mockResolvedValue(DELIVERED_ORDER)

    const res = await agent
      .patch(`/api/orders/${ORDER.id}/status`)
      .set(cookieFor(sellerToken))
      .send({ status: 'CANCELLED' })

    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION')
  })

  test('409 – invalid transition from terminal CANCELLED state', async () => {
    const cancelledOrder = makeOrder({ status: 'CANCELLED', sellerId: SELLER.id })

    prisma.user.findUnique.mockResolvedValue(SELLER)
    prisma.order.findUnique.mockResolvedValue(cancelledOrder)

    const res = await agent
      .patch(`/api/orders/${ORDER.id}/status`)
      .set(cookieFor(sellerToken))
      .send({ status: 'PENDING' })

    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION')
  })

  test('409 – concurrent modification detected (optimistic lock)', async () => {
    prisma.user.findUnique.mockResolvedValue(SELLER)
    prisma.order.findUnique.mockResolvedValue(PENDING_ORDER)
    // updateMany returns count:0 → status was changed by a concurrent request
    prisma.order.updateMany.mockResolvedValue({ count: 0 })
    prisma.orderHistory.create.mockResolvedValue({})

    const res = await agent
      .patch(`/api/orders/${ORDER.id}/status`)
      .set(cookieFor(sellerToken))
      .send({ status: 'CONFIRMED' })

    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('CONCURRENT_MODIFICATION')
  })

  test('403 – BUYER cannot update order status', async () => {
    prisma.user.findUnique.mockResolvedValue(BUYER)

    const res = await agent
      .patch(`/api/orders/${ORDER.id}/status`)
      .set(cookieFor(buyerToken))
      .send({ status: 'CONFIRMED' })

    expect(res.status).toBe(403)
  })

  test('403 – SELLER cannot update another seller\'s order', async () => {
    const otherSeller = makeSeller({ id: IDS.OTHER_SELLER, email: 'other-seller@test.com' })
    const otherToken  = makeToken({ id: otherSeller.id, email: otherSeller.email, role: 'SELLER' })

    prisma.user.findUnique.mockResolvedValue(otherSeller)
    // ORDER.sellerId = 'user-seller-uuid', but this user is 'other-seller-uuid'
    prisma.order.findUnique.mockResolvedValue(PENDING_ORDER)

    const res = await agent
      .patch(`/api/orders/${ORDER.id}/status`)
      .set(cookieFor(otherToken))
      .send({ status: 'CONFIRMED' })

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  test('404 – order does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(SELLER)
    prisma.order.findUnique.mockResolvedValue(null)

    const res = await agent
      .patch(`/api/orders/${IDS.NOT_FOUND}/status`)
      .set(cookieFor(sellerToken))
      .send({ status: 'CONFIRMED' })

    expect(res.status).toBe(404)
  })

  test('400 – target status is missing from request body', async () => {
    prisma.user.findUnique.mockResolvedValue(SELLER)

    const res = await agent
      .patch(`/api/orders/${ORDER.id}/status`)
      .set(cookieFor(sellerToken))
      .send({}) // missing status

    expect(res.status).toBe(400)
  })
})
