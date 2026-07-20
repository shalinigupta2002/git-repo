'use strict'

jest.mock('../../src/config/database')
jest.mock('../../src/utils/audit')

const { Prisma } = require('@prisma/client')
const { agent, cookieFor, makeToken, IDS } = require('../../src/__tests__/helpers')
const { prisma } = require('../../src/config/database')

const buyerToken = makeToken({ id: IDS.BUYER, role: 'BUYER' })
const sellerToken = makeToken({ id: IDS.SELLER, role: 'SELLER' })
const adminToken = makeToken({ id: IDS.ADMIN, role: 'ADMIN' })
const strangerToken = makeToken({ id: IDS.STRANGER, role: 'BUYER' })

function makeDeal(overrides = {}) {
  return {
    id: IDS.DEAL,
    dealNumber: 'DEAL-2026-000001',
    quoteRequestId: '77777777-7777-4777-8777-777777777777',
    rfqGroupId: '88888888-8888-4888-8888-888888888888',
    orderId: IDS.ORDER,
    buyerId: IDS.BUYER,
    sellerId: IDS.SELLER,
    productId: IDS.PRODUCT,
    productName: 'Test Widget',
    productSku: 'PROD-001',
    productBrand: 'Brand',
    productCategory: 'Category',
    productUom: 'UNIT',
    productMoq: 1,
    vendorProductCode: 'CAT-001',
    quantity: 5,
    unitPrice: new Prisma.Decimal('900'),
    totalAmount: new Prisma.Decimal('4500'),
    currency: 'INR',
    status: 'PAYMENT_PENDING',
    buyerDealCharge: new Prisma.Decimal('90'),
    sellerDealCharge: new Prisma.Decimal('90'),
    buyerChargeConfigId: 'cfg-buyer',
    sellerChargeConfigId: 'cfg-seller',
    buyerChargeConfig: {
      id: 'cfg-buyer',
      audience: 'BUYER',
      planKey: 'BUYER_LIFETIME',
      displayName: 'Buyer Lifetime',
      chargeType: 'PERCENTAGE',
      value: new Prisma.Decimal('2'),
      currency: 'INR',
      isActive: true,
      updatedAt: new Date(),
    },
    sellerChargeConfig: {
      id: 'cfg-seller',
      audience: 'SELLER',
      planKey: 'SELLER_LIFETIME',
      displayName: 'Seller Lifetime',
      chargeType: 'PERCENTAGE',
      value: new Prisma.Decimal('2'),
      currency: 'INR',
      isActive: true,
      updatedAt: new Date(),
    },
    contactUnlockStatus: 'LOCKED',
    contactUnlockedAt: null,
    contactUnlockOverride: false,
    completedAt: null,
    cancelledAt: null,
    disputedAt: null,
    createdAt: new Date('2026-07-01'),
    updatedAt: new Date('2026-07-01'),
    payments: [
      {
        id: 'pay-buyer',
        dealId: IDS.DEAL,
        payerRole: 'BUYER',
        payerUserId: IDS.BUYER,
        paymentReference: 'DPAY-DEAL-2026-000001-BUYER',
        provider: 'dummy',
        providerOrderId: null,
        providerPaymentId: null,
        providerSignature: null,
        paymentStatus: 'PENDING',
        amount: new Prisma.Decimal('90'),
        currency: 'INR',
        paidAt: null,
        failureReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'pay-seller',
        dealId: IDS.DEAL,
        payerRole: 'SELLER',
        payerUserId: IDS.SELLER,
        paymentReference: 'DPAY-DEAL-2026-000001-SELLER',
        provider: 'dummy',
        providerOrderId: null,
        providerPaymentId: null,
        providerSignature: null,
        paymentStatus: 'PENDING',
        amount: new Prisma.Decimal('90'),
        currency: 'INR',
        paidAt: null,
        failureReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    events: [],
    quoteRequest: {
      id: '77777777-7777-4777-8777-777777777777',
      rfqNumber: 'RFQ-2026-000001',
      status: 'ACCEPTED',
    },
    buyer: {
      id: IDS.BUYER,
      portalUserId: 'USR-DEMO-000001',
      companyName: 'Buyer Co',
      email: 'buyer@test.com',
      addresses: [{ city: 'Kolkata', line1: '1 Buyer St', phone: '9000000001', state: 'WB', postalCode: '700001' }],
    },
    seller: {
      id: IDS.SELLER,
      portalUserId: 'USR-DEMO-000002',
      companyName: 'Seller Co',
      email: 'seller@test.com',
      addresses: [{ city: 'Mumbai', line1: '2 Seller Rd', phone: '9000000002', state: 'MH', postalCode: '400001' }],
    },
    ...overrides,
  }
}

function mockAuthenticatedBuyer() {
  prisma.user.findUnique.mockResolvedValue({
    id: IDS.BUYER,
    role: 'BUYER',
    email: 'buyer@test.com',
    companyName: 'Buyer Co',
    buyerSubscriptionPlan: 'BUYER_LIFETIME',
    buyerSubscriptionStatus: 'ACTIVE',
    sellerSubscriptionPlan: null,
    sellerSubscriptionStatus: null,
  })
  prisma.subscription.findMany.mockResolvedValue([
    {
      plan: 'BUYER_LIFETIME',
      status: 'ACTIVE',
      startsAt: new Date(),
      expiresAt: null,
    },
  ])
}

function mockAuthenticatedSeller() {
  prisma.user.findUnique.mockResolvedValue({
    id: IDS.SELLER,
    role: 'SELLER',
    email: 'seller@test.com',
    companyName: 'Seller Co',
    buyerSubscriptionPlan: null,
    buyerSubscriptionStatus: null,
    sellerSubscriptionPlan: 'SELLER_LIFETIME',
    sellerSubscriptionStatus: 'ACTIVE',
  })
  prisma.subscription.findMany.mockResolvedValue([
    {
      plan: 'SELLER_LIFETIME',
      status: 'ACTIVE',
      startsAt: new Date(),
      expiresAt: null,
    },
  ])
}

function mockAuthenticatedAdmin() {
  prisma.user.findUnique.mockResolvedValue({
    id: IDS.ADMIN,
    role: 'ADMIN',
    email: 'admin@test.com',
    companyName: 'Admin',
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  prisma.$transaction.mockImplementation(async (fn) => fn(prisma))
  prisma.$queryRaw.mockResolvedValue([])
})

describe('Deal Management APIs', () => {
  test('401 – buyer deal list requires authentication', async () => {
    const res = await agent.get('/api/v1/deals')
    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })

  test('200 – buyer can list own deals', async () => {
    mockAuthenticatedBuyer()
    prisma.deal.findMany.mockResolvedValue([makeDeal()])
    prisma.deal.count.mockResolvedValue(1)

    const res = await agent
      .get('/api/v1/deals?page=1&limit=10&status=PAYMENT_PENDING')
      .set(cookieFor(buyerToken))

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.deals).toHaveLength(1)
    expect(res.body.data.pagination.total).toBe(1)
    expect(prisma.deal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ buyerId: IDS.BUYER, status: 'PAYMENT_PENDING' }),
      }),
    )
  })

  test('404 – buyer cannot read another buyer deal', async () => {
    mockAuthenticatedBuyer()
    prisma.deal.findUnique.mockResolvedValue(makeDeal({ buyerId: IDS.OTHER_BUYER }))

    const res = await agent
      .get(`/api/v1/deals/${IDS.DEAL}`)
      .set(cookieFor(buyerToken))

    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('DEAL_NOT_FOUND')
  })

  test('200 – buyer can read own deal details with locked seller contact', async () => {
    mockAuthenticatedBuyer()
    prisma.deal.findUnique.mockResolvedValue(makeDeal())

    const res = await agent
      .get(`/api/v1/deals/${IDS.DEAL}`)
      .set(cookieFor(buyerToken))

    expect(res.status).toBe(200)
    expect(res.body.data.deal.dealNumber).toBe('DEAL-2026-000001')
    expect(res.body.data.deal.payments).toHaveLength(2)
    expect(res.body.data.deal.seller.portalUserId).toBe('USR-DEMO-000002')
    expect(res.body.data.deal.seller.city).toBe('Mumbai')
    expect(res.body.data.deal.seller.companyName).toBeUndefined()
  })

  test('200 – buyer duplicate payment is idempotent', async () => {
    mockAuthenticatedBuyer()
    const deal = makeDeal({
      payments: [
        {
          ...makeDeal().payments[0],
          paymentStatus: 'SUCCESS',
          paidAt: new Date(),
        },
        makeDeal().payments[1],
      ],
    })

    prisma.deal.findUnique.mockImplementation(async () => deal)

    const res = await agent
      .post(`/api/v1/deals/${IDS.DEAL}/pay`)
      .set(cookieFor(buyerToken))

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(prisma.dealPayment.updateMany).not.toHaveBeenCalled()
    expect(prisma.dealEvent.create).not.toHaveBeenCalled()
  })

  test('200 – buyer dummy payment succeeds', async () => {
    mockAuthenticatedBuyer()
    const deal = makeDeal()

    prisma.deal.findUnique.mockImplementation(async () => deal)
    prisma.dealPayment.updateMany.mockResolvedValue({ count: 1 })
    prisma.dealPayment.findMany.mockResolvedValue([
      { ...deal.payments[0], paymentStatus: 'SUCCESS' },
      deal.payments[1],
    ])
    prisma.deal.update.mockImplementation(({ data }) => Promise.resolve({
      ...deal,
      ...data,
    }))
    prisma.deal.updateMany.mockResolvedValue({ count: 0 })
    prisma.dealEvent.create.mockResolvedValue({ id: 'evt-1' })

    const res = await agent
      .post(`/api/v1/deals/${IDS.DEAL}/pay`)
      .set(cookieFor(buyerToken))

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(prisma.dealPayment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ paymentStatus: 'PENDING' }),
        data: expect.objectContaining({ paymentStatus: 'SUCCESS' }),
      }),
    )
    expect(res.body.data.deal.seller.companyName).toBeUndefined()
    expect(res.body.data.deal.seller.city).toBe('Mumbai')
  })

  test('200 – seller dummy payment succeeds and unlocks contacts', async () => {
    mockAuthenticatedSeller()
    const deal = makeDeal()
    const unlockedDeal = {
      ...deal,
      status: 'ACTIVE',
      contactUnlockStatus: 'UNLOCKED',
      contactUnlockedAt: new Date(),
      payments: [
        { ...deal.payments[0], paymentStatus: 'SUCCESS' },
        { ...deal.payments[1], paymentStatus: 'SUCCESS' },
      ],
    }

    let findCalls = 0
    prisma.deal.findUnique.mockImplementation(async () => {
      findCalls += 1
      if (findCalls <= 2) return deal
      if (findCalls === 3) {
        return {
          ...deal,
          payments: [
            { ...deal.payments[0], paymentStatus: 'SUCCESS' },
            { ...deal.payments[1], paymentStatus: 'SUCCESS' },
          ],
        }
      }
      return unlockedDeal
    })
    prisma.dealPayment.updateMany.mockResolvedValue({ count: 1 })
    prisma.dealPayment.findMany.mockResolvedValue([
      { ...deal.payments[0], paymentStatus: 'SUCCESS' },
      { ...deal.payments[1], paymentStatus: 'SUCCESS' },
    ])
    prisma.deal.update.mockImplementation(({ data }) => Promise.resolve({
      ...deal,
      ...data,
      status: data.status ?? deal.status,
    }))
    prisma.deal.updateMany.mockResolvedValue({ count: 1 })
    prisma.dealEvent.create.mockResolvedValue({ id: 'evt-1' })

    const res = await agent
      .post(`/api/v1/seller/deals/${IDS.DEAL}/pay`)
      .set(cookieFor(sellerToken))

    expect(res.status).toBe(200)
    expect(prisma.dealEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: 'CONTACT_UNLOCKED' }),
      }),
    )
    expect(res.body.data.deal.contactUnlockStatus).toBe('UNLOCKED')
    expect(res.body.data.deal.buyer.email).toBe('buyer@test.com')
    expect(res.body.data.deal.seller.phone).toBe('9000000002')
  })

  test('403 – stranger cannot pay buyer deal', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: IDS.STRANGER,
      role: 'BUYER',
      email: 'stranger@test.com',
      buyerSubscriptionPlan: 'BUYER_LIFETIME',
      buyerSubscriptionStatus: 'ACTIVE',
      sellerSubscriptionPlan: null,
      sellerSubscriptionStatus: null,
    })
    prisma.subscription.findMany.mockResolvedValue([
      { plan: 'BUYER_LIFETIME', status: 'ACTIVE', startsAt: new Date(), expiresAt: null },
    ])

    const deal = makeDeal()
    prisma.deal.findUnique.mockResolvedValue(deal)

    const res = await agent
      .post(`/api/v1/deals/${IDS.DEAL}/pay`)
      .set(cookieFor(strangerToken))

    expect(res.status).toBe(404)
  })

  test('200 – admin lists all deals', async () => {
    mockAuthenticatedAdmin()
    prisma.deal.findMany.mockResolvedValue([makeDeal()])
    prisma.deal.count.mockResolvedValue(1)

    const res = await agent
      .get(`/api/v1/admin/deals?buyerId=${IDS.BUYER}`)
      .set(cookieFor(adminToken))

    expect(res.status).toBe(200)
    expect(res.body.data.deals).toHaveLength(1)
  })

  test('200 – admin lists charge configs', async () => {
    mockAuthenticatedAdmin()
    prisma.dealChargeConfig.upsert.mockResolvedValue({})
    prisma.dealChargeConfig.updateMany.mockResolvedValue({ count: 0 })
    prisma.user.findMany.mockResolvedValue([])
    prisma.deal.count.mockResolvedValue(0)
    prisma.dealChargeConfig.findMany.mockResolvedValue([
      {
        id: 'cfg-buyer',
        audience: 'BUYER',
        planKey: 'BUYER_LIFETIME',
        displayName: 'Buyer Lifetime',
        chargeType: 'PERCENTAGE',
        value: new Prisma.Decimal('2'),
        currency: 'INR',
        isActive: true,
        updatedAt: new Date(),
      },
    ])

    const res = await agent
      .get('/api/v1/admin/deal-charge-configs')
      .set(cookieFor(adminToken))

    expect(res.status).toBe(200)
    expect(res.body.data.configs).toHaveLength(1)
  })

  test('200 – admin updates charge config', async () => {
    mockAuthenticatedAdmin()
    prisma.dealChargeConfig.upsert.mockResolvedValue({})
    prisma.dealChargeConfig.updateMany.mockResolvedValue({ count: 0 })
    prisma.dealChargeConfig.findUnique.mockResolvedValue({
      id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      audience: 'BUYER',
      planKey: 'BUYER_LIFETIME',
      chargeType: 'PERCENTAGE',
      value: new Prisma.Decimal('2'),
      currency: 'INR',
      isActive: true,
    })
    prisma.dealChargeConfig.update.mockResolvedValue({
      id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      audience: 'BUYER',
      planKey: 'BUYER_LIFETIME',
      displayName: 'Buyer Lifetime Updated',
      chargeType: 'FLAT',
      value: new Prisma.Decimal('250'),
      currency: 'INR',
      isActive: true,
      updatedAt: new Date(),
    })

    const res = await agent
      .put('/api/v1/admin/deal-charge-configs/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee')
      .set(cookieFor(adminToken))
      .send({ chargeType: 'FLAT', value: 250, displayName: 'Buyer Lifetime Updated' })

    expect(res.status).toBe(200)
    expect(res.body.data.config.chargeType).toBe('FLAT')
    expect(res.body.data.config.value).toBe('250')
  })
})
