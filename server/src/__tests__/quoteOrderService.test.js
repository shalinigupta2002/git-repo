'use strict'

jest.mock('../config/database')
jest.mock('../controllers/orderController.js', () => ({
  applyInventoryChanges: jest.fn().mockResolvedValue(undefined),
}))

const { Prisma } = require('@prisma/client')
const { prisma } = require('../config/database')
const { createOrderFromQuote } = require('../services/quoteOrderService.js')

describe('quoteOrderService', () => {
  const quote = {
    id: 'quote-1',
    buyerId: 'buyer-1',
    sellerId: 'seller-1',
    productId: 'product-1',
    quantity: 10,
    sellerUnitPrice: new Prisma.Decimal('100'),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    prisma.order.findFirst.mockResolvedValue(null)
    prisma.product.findUnique.mockResolvedValue({
      id: 'product-1',
      sellerId: 'seller-1',
      moq: 5,
      name: 'Widget',
      trackInventory: false,
      stockQty: 100,
      reservedQty: 0,
    })
    prisma.order.create.mockImplementation(({ data }) => Promise.resolve({
      id: 'order-1',
      orderNumber: 'ORD-TEST',
      status: data.status,
      totalAmount: data.totalAmount,
      buyerId: data.buyerId,
      sellerId: data.sellerId,
      items: [],
      buyer: { id: 'buyer-1' },
      seller: { id: 'seller-1' },
    }))
  })

  test('creates order from accepted quote', async () => {
    const order = await createOrderFromQuote(prisma, quote, 'buyer-1')
    expect(order.id).toBe('order-1')
    expect(prisma.order.create).toHaveBeenCalled()
  })

  test('rejects quantity below MOQ', async () => {
    await expect(
      createOrderFromQuote(prisma, { ...quote, quantity: 2 }, 'buyer-1'),
    ).rejects.toMatchObject({ code: 'BELOW_MOQ' })
  })

  test('returns existing order for idempotency key', async () => {
    prisma.order.findFirst.mockResolvedValue({ id: 'existing-order' })
    const order = await createOrderFromQuote(prisma, quote, 'buyer-1')
    expect(order.id).toBe('existing-order')
    expect(prisma.order.create).not.toHaveBeenCalled()
  })

  test('requires linked product', async () => {
    await expect(
      createOrderFromQuote(prisma, { ...quote, productId: null }, 'buyer-1'),
    ).rejects.toMatchObject({ code: 'NO_PRODUCT' })
  })
})
