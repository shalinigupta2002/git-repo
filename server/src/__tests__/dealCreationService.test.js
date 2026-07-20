'use strict'

jest.mock('../config/database')
jest.mock('../controllers/orderController.js', () => ({
  applyInventoryChanges: jest.fn().mockResolvedValue(undefined),
}))

const { Prisma } = require('@prisma/client')
const { prisma } = require('../config/database')
const { createDealFromAcceptedQuote } = require('../services/dealCreationService.js')
const { DEAL_EVENT_TYPES } = require('../services/dealEventService.js')

describe('dealCreationService integration', () => {
  const quote = {
    id: 'quote-1',
    buyerId: 'buyer-1',
    sellerId: 'seller-1',
    productId: 'product-1',
    productTitle: 'Industrial Pump',
    brandName: 'AquaPro',
    productCategory: 'Pumps',
    catalogProductId: 'CAT-001',
    quantity: 10,
    sellerUnitPrice: new Prisma.Decimal('1000'),
    sellerCurrency: 'INR',
    rfqGroupId: 'group-1',
    status: 'RESPONDED',
  }

  const buyerConfig = {
    id: 'cfg-buyer',
    audience: 'BUYER',
    planKey: 'BUYER_LIFETIME',
    chargeType: 'PERCENTAGE',
    value: new Prisma.Decimal('2'),
    currency: 'INR',
    isActive: true,
  }

  const sellerConfig = {
    id: 'cfg-seller',
    audience: 'SELLER',
    planKey: 'SELLER_LIFETIME',
    chargeType: 'PERCENTAGE',
    value: new Prisma.Decimal('2'),
    currency: 'INR',
    isActive: true,
  }

  function mockSuccessfulCreation() {
    prisma.deal.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'deal-1',
        dealNumber: 'DEAL-2026-000001',
        status: 'PAYMENT_PENDING',
        quoteRequestId: quote.id,
        buyerDealCharge: new Prisma.Decimal('200'),
        sellerDealCharge: new Prisma.Decimal('200'),
        contactUnlockStatus: 'LOCKED',
        payments: [
          { id: 'pay-buyer', payerRole: 'BUYER', paymentStatus: 'PENDING' },
          { id: 'pay-seller', payerRole: 'SELLER', paymentStatus: 'PENDING' },
        ],
        events: [],
      })

    prisma.dealNumberCounter.upsert.mockResolvedValue({ year: 2026, lastValue: 1 })
    prisma.product.findUnique.mockResolvedValue({
      id: 'product-1',
      sku: 'SKU-001',
      moq: 5,
      name: 'Industrial Pump',
    })
    prisma.subscription.findMany
      .mockResolvedValueOnce([{ plan: 'BUYER_LIFETIME' }])
      .mockResolvedValueOnce([{ plan: 'SELLER_LIFETIME' }])
    prisma.dealChargeConfig.findFirst
      .mockResolvedValueOnce(buyerConfig)
      .mockResolvedValueOnce(sellerConfig)

    prisma.deal.create.mockImplementation(({ data }) => Promise.resolve({
      id: 'deal-1',
      ...data,
    }))

    prisma.deal.update.mockImplementation(({ data }) => Promise.resolve({
      id: 'deal-1',
      dealNumber: 'DEAL-2026-000001',
      status: data.status,
      quoteRequestId: quote.id,
      contactUnlockStatus: 'LOCKED',
    }))

    prisma.dealPayment.findUnique.mockResolvedValue(null)
    prisma.dealPayment.create
      .mockResolvedValueOnce({
        id: 'pay-buyer',
        payerRole: 'BUYER',
        paymentStatus: 'PENDING',
        paymentReference: 'DPAY-DEAL-2026-000001-BUYER',
        amount: new Prisma.Decimal('200'),
      })
      .mockResolvedValueOnce({
        id: 'pay-seller',
        payerRole: 'SELLER',
        paymentStatus: 'PENDING',
        paymentReference: 'DPAY-DEAL-2026-000001-SELLER',
        amount: new Prisma.Decimal('200'),
      })

    prisma.dealEvent.create.mockResolvedValue({ id: 'event-1' })
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('quotation accept → deal created → payments pending → events appended', async () => {
    mockSuccessfulCreation()

    const deal = await createDealFromAcceptedQuote(prisma, {
      quote,
      orderId: 'order-1',
      actorUserId: 'buyer-1',
    })

    expect(deal.status).toBe('PAYMENT_PENDING')
    expect(deal.contactUnlockStatus).toBe('LOCKED')
    expect(prisma.deal.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        productName: 'Industrial Pump',
        productSku: 'SKU-001',
        vendorProductCode: 'CAT-001',
        status: 'QUOTATION_ACCEPTED',
      }),
    }))
    expect(prisma.dealPayment.create).toHaveBeenCalledTimes(2)
    expect(prisma.dealEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ eventType: DEAL_EVENT_TYPES.DEAL_CREATED }),
    }))
    expect(prisma.dealEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ eventType: DEAL_EVENT_TYPES.PAYMENT_CREATED }),
    }))
  })

  test('returns existing deal for duplicate quotation', async () => {
    const existing = { id: 'deal-existing', dealNumber: 'DEAL-2026-000010', payments: [], events: [] }
    prisma.deal.findUnique.mockResolvedValue(existing)

    const deal = await createDealFromAcceptedQuote(prisma, {
      quote,
      actorUserId: 'buyer-1',
    })

    expect(deal.id).toBe('deal-existing')
    expect(prisma.deal.create).not.toHaveBeenCalled()
  })

  test('rejects invalid quotation status', async () => {
    await expect(createDealFromAcceptedQuote(prisma, {
      quote: { ...quote, status: 'PENDING' },
      actorUserId: 'buyer-1',
    })).rejects.toMatchObject({ code: 'INVALID_QUOTATION' })
  })

  test('rolls back when charge config missing', async () => {
    prisma.deal.findUnique.mockResolvedValue(null)
    prisma.dealNumberCounter.upsert.mockResolvedValue({ year: 2026, lastValue: 2 })
    prisma.product.findUnique.mockResolvedValue({ id: 'product-1', sku: 'SKU-001', moq: 1, name: 'Pump' })
    prisma.subscription.findMany.mockResolvedValue([{ plan: 'BUYER_LIFETIME' }])
    prisma.dealChargeConfig.findFirst.mockResolvedValue(null)

    await expect(createDealFromAcceptedQuote(prisma, {
      quote,
      actorUserId: 'buyer-1',
    })).rejects.toMatchObject({ code: 'MISSING_CHARGE_CONFIG' })

    expect(prisma.deal.create).not.toHaveBeenCalled()
    expect(prisma.dealPayment.create).not.toHaveBeenCalled()
  })

  test('transaction failure when deal create throws', async () => {
    mockSuccessfulCreation()
    prisma.deal.create.mockRejectedValue(new Error('db failure'))

    await expect(createDealFromAcceptedQuote(prisma, {
      quote,
      actorUserId: 'buyer-1',
    })).rejects.toThrow('db failure')

    expect(prisma.dealPayment.create).not.toHaveBeenCalled()
  })
})
