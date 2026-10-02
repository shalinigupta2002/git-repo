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

function mockSuccessfulDecide(existing, statusAfter) {
  const decided = { ...existing, status: statusAfter }
  prisma.categoryRequest.findUnique
    .mockResolvedValueOnce(existing)
    .mockResolvedValueOnce(decided)
  prisma.categoryRequest.updateMany.mockResolvedValue({ count: 1 })
  prisma.$executeRawUnsafe.mockResolvedValue(undefined)
}

describe('PATCH /api/admin/category-requests/:id/decide (VAL-007-05)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    query.mockResolvedValue({ rows: [], rowCount: 1 })
    prisma.$transaction.mockImplementation(async (fn) => fn(prisma))
  })

  test('valid REJECTED decision updates request', async () => {
    mockAdminAuth()
    const existing = pendingCategoryRequest()
    mockSuccessfulDecide(existing, 'REJECTED')

    const res = await agent
      .patch(`/api/admin/category-requests/${REQ_ID}/decide`)
      .set(cookieFor(adminToken))
      .send({ decision: 'REJECTED', adminNote: 'Not suitable' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(prisma.$transaction).toHaveBeenCalled()
    expect(prisma.categoryRequest.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: REQ_ID, status: 'PENDING' },
        data: expect.objectContaining({ status: 'REJECTED', adminNote: 'Not suitable' }),
      }),
    )
    expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled()
  })

  test('valid APPROVED decision for CATEGORY runs catalog insert in transaction', async () => {
    mockAdminAuth()
    const existing = pendingCategoryRequest()
    mockSuccessfulDecide(existing, 'APPROVED')

    const res = await agent
      .patch(`/api/admin/category-requests/${REQ_ID}/decide`)
      .set(cookieFor(adminToken))
      .send({ decision: 'APPROVED' })

    expect(res.status).toBe(200)
    expect(prisma.$transaction).toHaveBeenCalled()
    expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO catalog.categories'),
      'Requested Category',
      expect.any(String),
    )
    expect(prisma.categoryRequest.updateMany).toHaveBeenCalled()
  })

  test('valid APPROVED decision for SUBCATEGORY with parentId runs catalog insert', async () => {
    mockAdminAuth()
    const existing = pendingCategoryRequest({
      requestType: 'SUBCATEGORY',
      parentCategoryId: 42,
    })
    mockSuccessfulDecide(existing, 'APPROVED')
    query.mockImplementation(async (sql) => {
      if (String(sql).includes('parent_id IS NULL')) {
        return { rows: [{ id: 42, name: 'Root', slug: 'root' }] }
      }
      if (String(sql).includes('SELECT slug FROM catalog.categories')) {
        return { rows: [{ slug: 'root' }] }
      }
      return { rows: [], rowCount: 0 }
    })

    const res = await agent
      .patch(`/api/admin/category-requests/${REQ_ID}/decide`)
      .set(cookieFor(adminToken))
      .send({ decision: 'APPROVED', parentId: 42 })

    expect(res.status).toBe(200)
    expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO catalog.categories'),
      expect.any(String),
      expect.any(String),
      42,
    )
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
    mockSuccessfulDecide(pendingCategoryRequest(), 'REJECTED')

    const res = await agent
      .patch(`/api/admin/category-requests/${REQ_ID}/decide`)
      .set(cookieFor(adminToken))
      .send({ decision: 'REJECTED', adminNote: note })

    expect(res.status).toBe(200)
    expect(prisma.categoryRequest.updateMany).toHaveBeenCalledWith(
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
    mockSuccessfulDecide(pendingCategoryRequest(), 'APPROVED')

    const res = await agent
      .patch(`/api/admin/category-requests/${REQ_ID}/decide`)
      .set(cookieFor(adminToken))
      .send({ decision: 'APPROVED', name })

    expect(res.status).toBe(200)
    expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO catalog.categories'),
      name,
      expect.any(String),
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
    mockSuccessfulDecide(pendingCategoryRequest({ categoryName: 'From Request' }), 'APPROVED')

    const res = await agent
      .patch(`/api/admin/category-requests/${REQ_ID}/decide`)
      .set(cookieFor(adminToken))
      .send({ decision: 'APPROVED' })

    expect(res.status).toBe(200)
    expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.any(String),
      'From Request',
      expect.any(String),
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
    expect(prisma.$transaction).not.toHaveBeenCalled()
    expect(prisma.categoryRequest.updateMany).not.toHaveBeenCalled()
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
    expect(prisma.$transaction).not.toHaveBeenCalled()
    expect(prisma.categoryRequest.updateMany).not.toHaveBeenCalled()
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
    expect(prisma.$transaction).not.toHaveBeenCalled()
    expect(prisma.categoryRequest.updateMany).not.toHaveBeenCalled()
    expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled()
  })

  test('ERR-001 catalog insert failure rolls back status update (transaction aborts)', async () => {
    mockAdminAuth()
    const existing = pendingCategoryRequest()
    prisma.categoryRequest.findUnique.mockResolvedValueOnce(existing)
    prisma.categoryRequest.updateMany.mockResolvedValue({ count: 1 })
    prisma.$executeRawUnsafe.mockRejectedValue(new Error('catalog insert failed'))

    const res = await agent
      .patch(`/api/admin/category-requests/${REQ_ID}/decide`)
      .set(cookieFor(adminToken))
      .send({ decision: 'APPROVED' })

    expect(res.status).toBe(500)
    expect(prisma.$transaction).toHaveBeenCalled()
    expect(prisma.categoryRequest.updateMany).toHaveBeenCalled()
    expect(prisma.$executeRawUnsafe).toHaveBeenCalled()
  })
})
