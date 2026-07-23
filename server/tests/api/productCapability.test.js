'use strict'

jest.mock('../../src/config/database')

const { agent, makeToken, cookieFor, IDS } = require('../../src/__tests__/helpers')
const { prisma } = require('../../src/config/database')

describe('Product Workspace Capability API Checks', () => {
  beforeEach(() => {
    prisma.product.findMany.mockResolvedValue([])
    prisma.product.count.mockResolvedValue(0)
    jest.clearAllMocks()
  })

  // Test 1: Buyer role on BOTH subscription should be allowed to call mine=true
  test('200 – BOTH subscription (role = BUYER) can access mine=true', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: IDS.BUYER,
      email: 'both@test.com',
      role: 'BUYER',
      isActive: true,
    })

    // Mock active SELLER subscription presence (making it BOTH capable)
    prisma.subscription.findFirst.mockResolvedValue({ id: 'sub-001', status: 'ACTIVE' })

    const token = makeToken({ id: IDS.BUYER, role: 'BUYER' })
    const res = await agent
      .get('/api/products?mine=true')
      .set(cookieFor(token))

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  // Test 2: Seller role on SELLER subscription should be allowed to call mine=true
  test('200 – SELLER subscription (role = SELLER) can access mine=true', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: IDS.SELLER,
      email: 'seller@test.com',
      role: 'SELLER',
      isActive: true,
    })

    // hasActiveSubscription returns true for SELLER role or active plan
    prisma.subscription.findFirst.mockResolvedValue({ id: 'sub-002', status: 'ACTIVE' })

    const token = makeToken({ id: IDS.SELLER, role: 'SELLER' })
    const res = await agent
      .get('/api/products?mine=true')
      .set(cookieFor(token))

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  // Test 3: Buyer role on BUYER-only subscription should be blocked from mine=true
  test('400 – BUYER-only subscription cannot access mine=true', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: IDS.BUYER,
      email: 'buyer-only@test.com',
      role: 'BUYER',
      isActive: true,
    })

    // hasActiveSubscription returns false because no SELLER/BOTH plan is mock-returned
    prisma.subscription.findFirst.mockResolvedValue(null)

    const token = makeToken({ id: IDS.BUYER, role: 'BUYER' })
    const res = await agent
      .get('/api/products?mine=true')
      .set(cookieFor(token))

    expect(res.status).toBe(400)
    expect(res.body.error.message).toBe('mine=true requires seller authentication')
  })

  // Test 4: Inactive product owned by buyer role user on BOTH plan should be visible to them
  test('200 – BOTH subscription user can view their own inactive product', async () => {
    const productId = '12345678-1234-1234-1234-1234567890ab' // Valid UUID
    const myProduct = {
      id: productId,
      name: 'Test Product',
      sellerId: IDS.BUYER, // Owned by the buyer user
      isActive: false,      // Inactive product
    }

    prisma.product.findUnique.mockResolvedValue(myProduct)

    const token = makeToken({ id: IDS.BUYER, role: 'BUYER' })
    const res = await agent
      .get(`/api/products/${productId}`)
      .set(cookieFor(token))

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.product.id).toBe(productId)
  })
})
