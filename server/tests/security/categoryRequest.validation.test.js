'use strict'

jest.mock('../../src/config/database')

const categoryRequestController = require('../../src/controllers/categoryRequestController.js')
const { agent, cookieFor, makeToken, IDS } = require('../../src/__tests__/helpers')
const { prisma } = require('../../src/config/database')

const sellerToken = makeToken({ id: IDS.SELLER, role: 'SELLER' })
const buyerToken = makeToken({ id: IDS.BUYER, role: 'BUYER' })

function mockSellerAuth() {
  prisma.user.findUnique.mockResolvedValue({ id: IDS.SELLER, role: 'SELLER', isActive: true })
}

function mockCreateSuccess(overrides = {}) {
  prisma.categoryRequest.findFirst.mockResolvedValue(null)
  prisma.categoryRequest.create.mockResolvedValue({
    id: 'req-1',
    sellerId: IDS.SELLER,
    categoryName: 'Cat',
    requestType: 'CATEGORY',
    status: 'PENDING',
    description: null,
    ...overrides,
  })
}

describe('POST /api/category-requests (VAL-006)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('accepts valid categoryName and description', async () => {
    mockSellerAuth()
    mockCreateSuccess({ categoryName: 'Industrial Metals', description: 'New vertical' })

    const res = await agent
      .post('/api/category-requests')
      .set(cookieFor(sellerToken))
      .send({ categoryName: 'Industrial Metals', description: 'New vertical' })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(prisma.categoryRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          categoryName: 'Industrial Metals',
          description: 'New vertical',
        }),
      }),
    )
  })

  test('accepts categoryName at exactly 200 characters', async () => {
    mockSellerAuth()
    const categoryName = 'N'.repeat(200)
    mockCreateSuccess({ categoryName })

    const res = await agent
      .post('/api/category-requests')
      .set(cookieFor(sellerToken))
      .send({ categoryName })

    expect(res.status).toBe(201)
    expect(prisma.categoryRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ categoryName }) }),
    )
  })

  test('rejects categoryName longer than 200 characters', async () => {
    mockSellerAuth()
    const spy = jest.spyOn(categoryRequestController, 'createRequest')

    const res = await agent
      .post('/api/category-requests')
      .set(cookieFor(sellerToken))
      .send({ categoryName: 'X'.repeat(201) })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(spy).not.toHaveBeenCalled()
    expect(prisma.categoryRequest.create).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  test('accepts description at exactly 1000 characters', async () => {
    mockSellerAuth()
    const description = 'D'.repeat(1000)
    mockCreateSuccess({ categoryName: 'Cat', description })

    const res = await agent
      .post('/api/category-requests')
      .set(cookieFor(sellerToken))
      .send({ categoryName: 'Cat', description })

    expect(res.status).toBe(201)
    expect(prisma.categoryRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ description }) }),
    )
  })

  test('rejects description longer than 1000 characters', async () => {
    mockSellerAuth()

    const res = await agent
      .post('/api/category-requests')
      .set(cookieFor(sellerToken))
      .send({ categoryName: 'Cat', description: 'D'.repeat(1001) })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(prisma.categoryRequest.findFirst).not.toHaveBeenCalled()
    expect(prisma.categoryRequest.create).not.toHaveBeenCalled()
  })

  test('rejects whitespace-only categoryName', async () => {
    mockSellerAuth()

    const res = await agent
      .post('/api/category-requests')
      .set(cookieFor(sellerToken))
      .send({ categoryName: '   ' })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(prisma.categoryRequest.create).not.toHaveBeenCalled()
  })

  test('omitted description remains optional (stored as null)', async () => {
    mockSellerAuth()
    mockCreateSuccess({ categoryName: 'Solo Cat', description: null })

    const res = await agent
      .post('/api/category-requests')
      .set(cookieFor(sellerToken))
      .send({ categoryName: 'Solo Cat' })

    expect(res.status).toBe(201)
    expect(prisma.categoryRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ description: null }),
      }),
    )
  })

  test('401 without authentication', async () => {
    const res = await agent.post('/api/category-requests').send({ categoryName: 'Cat' })
    expect(res.status).toBe(401)
    expect(prisma.categoryRequest.create).not.toHaveBeenCalled()
  })

  test('403 for buyer', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: IDS.BUYER, role: 'BUYER', isActive: true })

    const res = await agent
      .post('/api/category-requests')
      .set(cookieFor(buyerToken))
      .send({ categoryName: 'Cat' })

    expect(res.status).toBe(403)
    expect(prisma.categoryRequest.create).not.toHaveBeenCalled()
  })
})
