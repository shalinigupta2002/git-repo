'use strict'

jest.mock('../../src/config/database')

const { agent, cookieFor, makeToken, IDS } = require('../../src/__tests__/helpers')
const { prisma } = require('../../src/config/database')

const adminToken = makeToken({ id: IDS.ADMIN, role: 'ADMIN' })
const buyerToken = makeToken({ id: IDS.BUYER, role: 'BUYER' })

function mockAdminUser() {
  prisma.user.findUnique.mockResolvedValue({ id: IDS.ADMIN, role: 'ADMIN' })
}

function mockCategoryRequestList(rows = [], total = 0) {
  prisma.categoryRequest.findMany.mockResolvedValue(rows)
  prisma.categoryRequest.count.mockResolvedValue(total)
}

describe('GET /api/admin/category-requests (VAL-002)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('valid status filter returns 200 and applies where clause', async () => {
    mockAdminUser()
    mockCategoryRequestList([{ id: 'req-1', status: 'APPROVED' }], 1)

    const res = await agent
      .get('/api/admin/category-requests?status=APPROVED')
      .set(cookieFor(adminToken))

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.requests).toHaveLength(1)
    expect(prisma.categoryRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'APPROVED' } }),
    )
  })

  test('invalid status returns 400 VALIDATION_ERROR', async () => {
    mockAdminUser()

    const res = await agent
      .get('/api/admin/category-requests?status=NOT_A_STATUS')
      .set(cookieFor(adminToken))

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(prisma.categoryRequest.findMany).not.toHaveBeenCalled()
    expect(prisma.categoryRequest.count).not.toHaveBeenCalled()
  })

  test('omitted query uses defaults page=1 limit=20', async () => {
    mockAdminUser()
    mockCategoryRequestList([], 0)

    const res = await agent.get('/api/admin/category-requests').set(cookieFor(adminToken))

    expect(res.status).toBe(200)
    expect(res.body.data.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    })
    expect(prisma.categoryRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 20, where: {} }),
    )
  })

  test('valid page and limit are accepted', async () => {
    mockAdminUser()
    mockCategoryRequestList([], 25)

    const res = await agent
      .get('/api/admin/category-requests?page=2&limit=10')
      .set(cookieFor(adminToken))

    expect(res.status).toBe(200)
    expect(res.body.data.pagination.page).toBe(2)
    expect(res.body.data.pagination.limit).toBe(10)
    expect(prisma.categoryRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 }),
    )
  })

  test.each([
    ['page', 'abc'],
    ['page', '2.5'],
    ['page', '0'],
    ['page', '-1'],
    ['limit', 'xyz'],
    ['limit', '0'],
    ['limit', '-5'],
    ['limit', '101'],
  ])('invalid %s=%s returns 400 and skips Prisma', async (param, value) => {
    mockAdminUser()

    const res = await agent
      .get(`/api/admin/category-requests?${param}=${value}`)
      .set(cookieFor(adminToken))

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(prisma.categoryRequest.findMany).not.toHaveBeenCalled()
    expect(prisma.categoryRequest.count).not.toHaveBeenCalled()
  })

  test('401 without authentication', async () => {
    const res = await agent.get('/api/admin/category-requests')
    expect(res.status).toBe(401)
    expect(prisma.categoryRequest.findMany).not.toHaveBeenCalled()
  })

  test('403 for non-admin user', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: IDS.BUYER, role: 'BUYER' })

    const res = await agent
      .get('/api/admin/category-requests')
      .set(cookieFor(buyerToken))

    expect(res.status).toBe(403)
    expect(prisma.categoryRequest.findMany).not.toHaveBeenCalled()
  })
})
