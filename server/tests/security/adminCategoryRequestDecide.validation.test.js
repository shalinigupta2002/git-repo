'use strict'

jest.mock('../../src/config/database')
jest.mock('../../src/db/pool.js', () => ({
  query: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
}))

const adminController = require('../../src/controllers/adminController.js')
const { agent, cookieFor, makeToken, IDS } = require('../../src/__tests__/helpers')
const { prisma } = require('../../src/config/database')
const { query } = require('../../src/db/pool.js')

const adminToken = makeToken({ id: IDS.ADMIN, role: 'ADMIN' })
const REQ_ID = '88888888-8888-4888-8888-888888888888'

function mockAdminAuth() {
  prisma.user.findUnique.mockResolvedValue({ id: IDS.ADMIN, role: 'ADMIN' })
}

function pendingCategoryRequest(overrides = {}) {
  return {
    id: REQ_ID,
    sellerId: IDS.SELLER,
    requestType: 'CATEGORY',
    categoryName: 'Requested Category',
    parentCategoryName: null,
    parentCategoryId: null,
    status: 'PENDING',
    ...overrides,
  }
}

describe('PATCH /api/admin/category-requests/:id/decide (VAL-007-05)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    query.mockResolvedValue({ rows: [], rowCount: 1 })
  })

  test('valid REJECTED decision updates request', async () => {
    mockAdminAuth()
    const existing = pendingCategoryRequest()
    prisma.categoryRequest.findUnique.mockResolvedValue(existing)
    prisma.categoryRequest.update.mockResolvedValue({ ...existing, status: 'REJECTED' })

    const res = await agent
      .patch(`/api/admin/category-requests/${REQ_ID}/decide`)
      .set(cookieFor(adminToken))
      .send({ decision: 'REJECTED', adminNote: 'Not suitable' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(prisma.categoryRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'REJECTED', adminNote: 'Not suitable' }),
      }),
    )
    expect(query).not.toHaveBeenCalled()
  })

  test('valid APPROVED decision for CATEGORY runs catalog insert', async () => {
    mockAdminAuth()
    const existing = pendingCategoryRequest()
    prisma.categoryRequest.findUnique.mockResolvedValue(existing)
    prisma.categoryRequest.update.mockResolvedValue({ ...existing, status: 'APPROVED' })

    const res = await agent
      .patch(`/api/admin/category-requests/${REQ_ID}/decide`)
      .set(cookieFor(adminToken))
      .send({ decision: 'APPROVED' })

    expect(res.status).toBe(200)
    expect(query).toHaveBeenCalled()
    expect(prisma.categoryRequest.update).toHaveBeenCalled()
  })

  test('invalid decision returns 400 VALIDATION_ERROR', async () => {
    mockAdminAuth()
    const spy = jest.spyOn(adminController, 'decideCategoryRequest')

    const res = await agent
      .patch(`/api/admin/category-requests/${REQ_ID}/decide`)
      .set(cookieFor(adminToken))
      .send({ decision: 'MAYBE' })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(spy).not.toHaveBeenCalled()
    expect(prisma.categoryRequest.findUnique).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  test('adminNote at exactly 500 characters is accepted', async () => {
    mockAdminAuth()
    const note = 'N'.repeat(500)
    prisma.categoryRequest.findUnique.mockResolvedValue(pendingCategoryRequest())
    prisma.categoryRequest.update.mockResolvedValue({ status: 'REJECTED' })

    const res = await agent
      .patch(`/api/admin/category-requests/${REQ_ID}/decide`)
      .set(cookieFor(adminToken))
      .send({ decision: 'REJECTED', adminNote: note })

    expect(res.status).toBe(200)
    expect(prisma.categoryRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ adminNote: note }) }),
    )
  })

  test('adminNote longer than 500 is rejected', async () => {
    mockAdminAuth()

    const res = await agent
      .patch(`/api/admin/category-requests/${REQ_ID}/decide`)
      .set(cookieFor(adminToken))
      .send({ decision: 'REJECTED', adminNote: 'N'.repeat(501) })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(prisma.categoryRequest.findUnique).not.toHaveBeenCalled()
  })

  test('name at exactly 200 characters on APPROVED is accepted', async () => {
    mockAdminAuth()
    const name = 'C'.repeat(200)
    prisma.categoryRequest.findUnique.mockResolvedValue(pendingCategoryRequest())
    prisma.categoryRequest.update.mockResolvedValue({ status: 'APPROVED' })

    const res = await agent
      .patch(`/api/admin/category-requests/${REQ_ID}/decide`)
      .set(cookieFor(adminToken))
      .send({ decision: 'APPROVED', name })

    expect(res.status).toBe(200)
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO catalog.categories'),
      expect.arrayContaining([name, expect.any(String)]),
    )
  })

  test('name longer than 200 is rejected', async () => {
    mockAdminAuth()

    const res = await agent
      .patch(`/api/admin/category-requests/${REQ_ID}/decide`)
      .set(cookieFor(adminToken))
      .send({ decision: 'APPROVED', name: 'X'.repeat(201) })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(prisma.categoryRequest.findUnique).not.toHaveBeenCalled()
  })

  test('omitted optional fields preserve behavior (uses existing category name)', async () => {
    mockAdminAuth()
    prisma.categoryRequest.findUnique.mockResolvedValue(pendingCategoryRequest({ categoryName: 'From Request' }))
    prisma.categoryRequest.update.mockResolvedValue({ status: 'APPROVED' })

    const res = await agent
      .patch(`/api/admin/category-requests/${REQ_ID}/decide`)
      .set(cookieFor(adminToken))
      .send({ decision: 'APPROVED' })

    expect(res.status).toBe(200)
    expect(query).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining(['From Request', expect.any(String)]),
    )
  })

  test('404 when category request not found', async () => {
    mockAdminAuth()
    prisma.categoryRequest.findUnique.mockResolvedValue(null)

    const res = await agent
      .patch(`/api/admin/category-requests/${REQ_ID}/decide`)
      .set(cookieFor(adminToken))
      .send({ decision: 'REJECTED' })

    expect(res.status).toBe(404)
    expect(prisma.categoryRequest.update).not.toHaveBeenCalled()
  })

  test('409 when request already decided', async () => {
    mockAdminAuth()
    prisma.categoryRequest.findUnique.mockResolvedValue(
      pendingCategoryRequest({ status: 'APPROVED' }),
    )

    const res = await agent
      .patch(`/api/admin/category-requests/${REQ_ID}/decide`)
      .set(cookieFor(adminToken))
      .send({ decision: 'REJECTED' })

    expect(res.status).toBe(409)
    expect(prisma.categoryRequest.update).not.toHaveBeenCalled()
  })

  test('400 PARENT_NOT_FOUND when subcategory parent cannot be resolved', async () => {
    mockAdminAuth()
    prisma.categoryRequest.findUnique.mockResolvedValue(
      pendingCategoryRequest({
        requestType: 'SUBCATEGORY',
        parentCategoryName: 'Missing Parent',
        parentCategoryId: null,
      }),
    )

    const res = await agent
      .patch(`/api/admin/category-requests/${REQ_ID}/decide`)
      .set(cookieFor(adminToken))
      .send({ decision: 'APPROVED' })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('PARENT_NOT_FOUND')
    expect(prisma.categoryRequest.update).toHaveBeenCalled()
    expect(query).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO catalog.categories'),
      expect.anything(),
    )
  })
})
