'use strict'

jest.mock('../../src/config/database')

const { agent, cookieFor, makeToken, IDS } = require('../../src/__tests__/helpers')
const { prisma } = require('../../src/config/database')

const sellerToken = makeToken({ id: IDS.SELLER, role: 'SELLER' })
const buyerToken = makeToken({ id: IDS.BUYER, role: 'BUYER' })

function mockSellerAuth() {
  prisma.user.findUnique.mockResolvedValue({ id: IDS.SELLER, role: 'SELLER' })
}

function mockOwnedProduct() {
  prisma.product.findUnique.mockResolvedValue({ sellerId: IDS.SELLER })
}

function mockInventoryLogs(logs = [], total = 0) {
  prisma.inventoryLog.findMany.mockResolvedValue(logs)
  prisma.inventoryLog.count.mockResolvedValue(total)
}

describe('GET /api/products/:id/inventory-logs (VAL-004)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('valid pagination returns 200 and queries with skip/take', async () => {
    mockSellerAuth()
    mockOwnedProduct()
    mockInventoryLogs([{ id: 'log-1', delta: 5 }], 1)

    const res = await agent
      .get(`/api/products/${IDS.PRODUCT}/inventory-logs?page=2&limit=25`)
      .set(cookieFor(sellerToken))

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.pagination.page).toBe(2)
    expect(res.body.data.pagination.limit).toBe(25)
    expect(prisma.inventoryLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 25, take: 25, where: { productId: IDS.PRODUCT } }),
    )
  })

  test('omitted pagination uses defaults page=1 limit=50', async () => {
    mockSellerAuth()
    mockOwnedProduct()
    mockInventoryLogs([], 0)

    const res = await agent
      .get(`/api/products/${IDS.PRODUCT}/inventory-logs`)
      .set(cookieFor(sellerToken))

    expect(res.status).toBe(200)
    expect(res.body.data.pagination).toEqual({
      page: 1,
      limit: 50,
      total: 0,
      totalPages: 0,
    })
    expect(prisma.inventoryLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 50 }),
    )
  })

  test.each([
    ['page', 'abc'],
    ['page', '1.5'],
    ['page', '0'],
    ['page', '-1'],
    ['limit', 'xyz'],
    ['limit', '0'],
    ['limit', '-3'],
    ['limit', '101'],
  ])('invalid %s=%s returns 400 and skips inventory queries', async (param, value) => {
    mockSellerAuth()

    const res = await agent
      .get(`/api/products/${IDS.PRODUCT}/inventory-logs?${param}=${value}`)
      .set(cookieFor(sellerToken))

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(prisma.product.findUnique).not.toHaveBeenCalled()
    expect(prisma.inventoryLog.findMany).not.toHaveBeenCalled()
    expect(prisma.inventoryLog.count).not.toHaveBeenCalled()
  })

  test('401 without authentication', async () => {
    const res = await agent.get(`/api/products/${IDS.PRODUCT}/inventory-logs`)
    expect(res.status).toBe(401)
    expect(prisma.inventoryLog.findMany).not.toHaveBeenCalled()
  })

  test('403 for buyer (seller workspace required)', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: IDS.BUYER, role: 'BUYER' })

    const res = await agent
      .get(`/api/products/${IDS.PRODUCT}/inventory-logs`)
      .set(cookieFor(buyerToken))

    expect(res.status).toBe(403)
    expect(prisma.inventoryLog.findMany).not.toHaveBeenCalled()
  })
})
