'use strict'

jest.mock('../../src/config/database')
jest.mock('../../src/services/sellerBrowseService.js', () => ({
  listSellerProducts: jest.fn(),
  getSellerProductById: jest.fn(),
  findAlternativeSellerListings: jest.fn(),
}))
jest.mock('../../src/services/productImageStorage.js', () => ({
  serveProductImage: jest.fn(),
}))
jest.mock('../../src/services/contactAttachmentStorage.js', () => ({
  serveContactAttachment: jest.fn(),
  userCanAccessContactAttachment: jest.fn(),
}))

const { agent, cookieFor, makeToken, IDS } = require('../../src/__tests__/helpers')
const { prisma } = require('../../src/config/database')
const sellerBrowseService = require('../../src/services/sellerBrowseService.js')
const { serveProductImage } = require('../../src/services/productImageStorage.js')
const {
  serveContactAttachment,
  userCanAccessContactAttachment,
} = require('../../src/services/contactAttachmentStorage.js')

const sellerToken = makeToken({ id: IDS.SELLER, role: 'SELLER' })
const buyerToken = makeToken({ id: IDS.BUYER, role: 'BUYER' })
const MSG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

describe('ERR-004 — error responses include stable error.code', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('GET /api/contact/:id returns 404 NOT_FOUND when thread missing', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: IDS.SELLER, role: 'SELLER', isActive: true })
    prisma.contactMessage.findFirst.mockResolvedValue(null)

    const res = await agent
      .get(`/api/contact/${MSG_ID}`)
      .set(cookieFor(sellerToken))

    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
    expect(res.body.error.message).toBe('Message not found')
  })

  test('PATCH /api/category-requests/:id/read returns 404 NOT_FOUND when missing', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: IDS.SELLER, role: 'SELLER', isActive: true })
    prisma.categoryRequest.findFirst.mockResolvedValue(null)

    const res = await agent
      .patch(`/api/category-requests/${MSG_ID}/read`)
      .set(cookieFor(sellerToken))

    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
    expect(res.body.error.message).toBe('Request not found')
  })

  test('POST /api/category-requests returns 409 CONFLICT for duplicate pending request', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: IDS.SELLER, role: 'SELLER', isActive: true })
    prisma.categoryRequest.findFirst.mockResolvedValue({ id: 'existing', status: 'PENDING' })

    const res = await agent
      .post('/api/category-requests')
      .set(cookieFor(sellerToken))
      .send({ categoryName: 'Duplicate Cat' })

    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('CONFLICT')
    expect(res.body.error.message).toBe('You already have a pending request for this category')
    expect(prisma.categoryRequest.create).not.toHaveBeenCalled()
  })

  test('GET /api/catalog/products/:id returns 404 NOT_FOUND when listing missing', async () => {
    sellerBrowseService.getSellerProductById.mockResolvedValue(null)

    const res = await agent.get('/api/catalog/products/dddddddd-dddd-4ddd-8ddd-dddddddddddd')

    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
    expect(res.body.error.message).toBe('Product not found')
  })

  test('GET /api/uploads/products/:filename returns 404 NOT_FOUND when file missing', async () => {
    serveProductImage.mockResolvedValue(false)

    const res = await agent.get('/api/uploads/products/missing.png')

    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
    expect(res.body.error.message).toBe('File not found')
  })

  test('GET /api/uploads/contact/:filename returns 404 NOT_FOUND when file missing', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: IDS.BUYER, role: 'BUYER', isActive: true })
    userCanAccessContactAttachment.mockResolvedValue(true)
    serveContactAttachment.mockResolvedValue(false)

    const res = await agent
      .get('/api/uploads/contact/sample.png')
      .set(cookieFor(buyerToken))

    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
    expect(res.body.error.message).toBe('File not found')
  })

  test('POST /api/quote-requests returns 400 VALIDATION_ERROR for invalid delivery date', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: IDS.BUYER, role: 'BUYER', isActive: true })
    prisma.subscription.findFirst.mockResolvedValue({ id: 'sub-001', status: 'ACTIVE' })

    const res = await agent
      .post('/api/quote-requests')
      .set(cookieFor(buyerToken))
      .send({
        productTitle: 'Widget',
        message: 'Need quote',
        deliveryLocation: 'Mumbai',
        expectedDeliveryDate: 'not-a-valid-date',
      })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(res.body.error.message).toBe('expectedDeliveryDate must be a valid date')
  })
})
