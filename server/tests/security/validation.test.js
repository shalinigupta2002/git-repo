'use strict'

jest.mock('../../src/config/database')

const { agent, cookieFor, makeToken, IDS } = require('../../src/__tests__/helpers')
const { prisma } = require('../../src/config/database')
const contactController = require('../../src/controllers/contactController.js')
const categoryRequestController = require('../../src/controllers/categoryRequestController.js')
const integrationController = require('../../src/controllers/integrationController.js')

const buyerToken = makeToken({ id: IDS.BUYER, role: 'BUYER' })
const sellerToken = makeToken({ id: IDS.SELLER, role: 'SELLER' })
const adminToken = makeToken({ id: IDS.ADMIN, role: 'ADMIN' })

const VALID_MSG_ID = '77777777-7777-4777-8777-777777777777'

describe('Validation and error handling', () => {
  test('400 – invalid UUID param on quote-requests/:id', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: IDS.BUYER, role: 'BUYER' })

    const res = await agent
      .get('/api/quote-requests/not-a-uuid')
      .set(cookieFor(buyerToken))

    expect(res.status).toBe(400)
  })

  test('400 – respond quote with invalid price', async () => {
    const sellerToken = makeToken({ id: IDS.SELLER, role: 'SELLER' })
    prisma.user.findUnique.mockResolvedValue({ id: IDS.SELLER, role: 'SELLER' })
    prisma.subscription.findFirst.mockResolvedValue({ id: 'sub-seller' })
    prisma.quoteRequest.findUnique.mockResolvedValue({
      id: '77777777-7777-4777-8777-777777777777',
      sellerId: IDS.SELLER,
      status: 'PENDING',
    })

    const res = await agent
      .patch('/api/quote-requests/77777777-7777-4777-8777-777777777777/respond')
      .set(cookieFor(sellerToken))
      .send({ sellerUnitPrice: -5 })

    expect(res.status).toBe(400)
  })

  test('404 – unknown API route returns structured not found', async () => {
    const res = await agent.get('/api/does-not-exist-route')
    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
  })
})

describe('VAL-001 – UUID route params', () => {
  test('400 – invalid UUID on GET /api/contact/:id (VALIDATION_ERROR)', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: IDS.BUYER, role: 'BUYER' })
    const spy = jest.spyOn(contactController, 'getMyMessage')

    const res = await agent
      .get('/api/contact/not-a-uuid')
      .set(cookieFor(buyerToken))

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  test('401 – valid UUID on contact without auth still requires login', async () => {
    const res = await agent.get(`/api/contact/${VALID_MSG_ID}`)
    expect(res.status).toBe(401)
  })

  test('404 – valid UUID on contact preserves not-found when thread missing', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: IDS.BUYER, role: 'BUYER' })
    prisma.contactMessage.findFirst.mockResolvedValue(null)

    const res = await agent
      .get(`/api/contact/${VALID_MSG_ID}`)
      .set(cookieFor(buyerToken))

    expect(res.status).toBe(404)
    expect(prisma.contactMessage.findFirst).toHaveBeenCalled()
  })

  test('400 – invalid UUID on PATCH /api/category-requests/:id/read', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: IDS.SELLER, role: 'SELLER' })
    const spy = jest.spyOn(categoryRequestController, 'markRead')

    const res = await agent
      .patch('/api/category-requests/bad-id/read')
      .set(cookieFor(sellerToken))

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  test('400 – invalid UUID on GET /api/admin/messages/:id', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: IDS.ADMIN, role: 'ADMIN' })
    const spy = jest.spyOn(contactController, 'adminGetMessage')

    const res = await agent
      .get('/api/admin/messages/not-a-uuid')
      .set(cookieFor(adminToken))

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  test('403 – invalid UUID on admin messages still requires admin (buyer blocked first)', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: IDS.BUYER, role: 'BUYER' })

    const res = await agent
      .get('/api/admin/messages/not-a-uuid')
      .set(cookieFor(buyerToken))

    expect(res.status).toBe(403)
  })

  test('400 – invalid UUID on PATCH /api/admin/category-requests/:id/decide', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: IDS.ADMIN, role: 'ADMIN' })
    const adminController = require('../../src/controllers/adminController.js')
    const decideSpy = jest.spyOn(adminController, 'decideCategoryRequest')

    const res = await agent
      .patch('/api/admin/category-requests/not-a-uuid/decide')
      .set(cookieFor(adminToken))
      .send({ decision: 'REJECTED' })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(decideSpy).not.toHaveBeenCalled()
    decideSpy.mockRestore()
  })

  test('400 – invalid UUID on GET /api/v1/users/:userId/profile', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: IDS.BUYER, role: 'BUYER' })
    const spy = jest.spyOn(integrationController, 'getUserProfile')

    const res = await agent
      .get('/api/v1/users/not-a-uuid/profile')
      .set(cookieFor(buyerToken))

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})
