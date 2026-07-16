'use strict'

jest.mock('../../src/config/database')
jest.mock('../../src/utils/audit')

const { agent, cookieFor, makeToken, IDS, makeProduct } = require('../../src/__tests__/helpers')
const { prisma } = require('../../src/config/database')

const buyerToken = makeToken({ id: IDS.BUYER, role: 'BUYER' })
const sellerToken = makeToken({ id: IDS.SELLER, role: 'SELLER' })

const RFQ_ID = '77777777-7777-4777-8777-777777777777'
const RFQ_GROUP_ID = '88888888-8888-4888-8888-888888888888'
const RFQ_NUMBER = 'RFQ-2026-000001'

const baseCreatePayload = {
  productTitle: 'Test Widget',
  quantity: 5,
  deliveryLocation: 'Mumbai, Maharashtra',
  expectedDeliveryDate: '2026-08-01',
}

function makeQuoteRow(overrides = {}) {
  return {
    id: RFQ_ID,
    rfqGroupId: RFQ_GROUP_ID,
    rfqNumber: RFQ_NUMBER,
    buyerId: IDS.BUYER,
    sellerId: IDS.SELLER,
    productId: IDS.PRODUCT,
    productTitle: 'Test Widget',
    quantity: 5,
    status: 'PENDING',
    targetPrice: null,
    message: null,
    deliveryLocation: 'Mumbai, Maharashtra',
    expectedDeliveryDate: new Date('2026-08-01'),
    attachments: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    buyer: { id: IDS.BUYER, addresses: [{ city: 'Mumbai' }] },
    seller: { id: IDS.SELLER, addresses: [{ city: 'Delhi' }] },
    product: { id: IDS.PRODUCT, name: 'Test Product', sku: 'PROD-001' },
    order: null,
    ...overrides,
  }
}

function mockSubscribedBuyer() {
  prisma.user.findUnique.mockResolvedValue({ id: IDS.BUYER, role: 'BUYER' })
  prisma.subscription.findFirst.mockResolvedValue({ id: 'sub-001', status: 'ACTIVE' })
}

beforeEach(() => {
  prisma.$transaction.mockImplementation(async (fn) => fn(prisma))
    prisma.rfqNumberCounter.upsert.mockResolvedValue({ year: 2026, lastValue: 1 })
    prisma.rfqGroup.create.mockResolvedValue({ id: RFQ_GROUP_ID, rfqNumber: RFQ_NUMBER, buyerId: IDS.BUYER })
})

describe('RFQ / quote-request APIs', () => {
  test('401 – create RFQ without authentication', async () => {
    const res = await agent.post('/api/quote-requests').send(baseCreatePayload)
    expect(res.status).toBe(401)
  })

  test('403 – buyer without subscription cannot create RFQ', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: IDS.BUYER, role: 'BUYER' })
    prisma.subscription.findFirst.mockResolvedValue(null)

    const res = await agent
      .post('/api/quote-requests')
      .set(cookieFor(buyerToken))
      .send(baseCreatePayload)

    expect(res.status).toBe(403)
  })

  test('201 – subscribed buyer can create RFQ for one seller', async () => {
    mockSubscribedBuyer()
    prisma.product.findUnique.mockResolvedValue(makeProduct())
    prisma.user.findMany.mockResolvedValue([{ id: IDS.SELLER }])
    prisma.quoteRequest.create.mockResolvedValue(makeQuoteRow())

    const res = await agent
      .post('/api/quote-requests')
      .set(cookieFor(buyerToken))
      .send({
        ...baseCreatePayload,
        productId: IDS.PRODUCT,
      })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.request.productTitle).toBe('Test Widget')
    expect(res.body.data.group.rfqNumber).toBe(RFQ_NUMBER)
    expect(res.body.data.group.requests).toHaveLength(1)
    expect(res.body.data.request.seller).toEqual(
      expect.objectContaining({ id: IDS.SELLER, city: 'Delhi' }),
    )
    expect(res.body.data.request.seller.email).toBeUndefined()
  })

  test('201 – creates one QuoteRequest per seller with shared rfqGroupId', async () => {
    mockSubscribedBuyer()
    prisma.user.findMany.mockResolvedValue([
      { id: IDS.SELLER },
      { id: IDS.OTHER_SELLER },
    ])

    const row1 = makeQuoteRow({ id: RFQ_ID, sellerId: IDS.SELLER })
    const row2 = makeQuoteRow({
      id: '99999999-9999-4999-8999-999999999999',
      sellerId: IDS.OTHER_SELLER,
      seller: { id: IDS.OTHER_SELLER, addresses: [{ city: 'Pune' }] },
    })

    prisma.quoteRequest.create
      .mockResolvedValueOnce(row1)
      .mockResolvedValueOnce(row2)

    const res = await agent
      .post('/api/quote-requests')
      .set(cookieFor(buyerToken))
      .send({
        ...baseCreatePayload,
        sellerIds: [IDS.SELLER, IDS.OTHER_SELLER],
      })

    expect(res.status).toBe(201)
    expect(prisma.quoteRequest.create).toHaveBeenCalledTimes(2)
    expect(res.body.data.group.rfqGroupId).toBeTruthy()
    expect(res.body.data.group.requests).toHaveLength(2)
    expect(res.body.data.group.rfqNumber).toBe(RFQ_NUMBER)
  })

  test('400 – missing productTitle rejected', async () => {
    mockSubscribedBuyer()

    const res = await agent
      .post('/api/quote-requests')
      .set(cookieFor(buyerToken))
      .send({ quantity: 1, deliveryLocation: 'Mumbai', expectedDeliveryDate: '2026-08-01' })

    expect(res.status).toBe(400)
  })

  test('400 – missing deliveryLocation rejected', async () => {
    mockSubscribedBuyer()

    const res = await agent
      .post('/api/quote-requests')
      .set(cookieFor(buyerToken))
      .send({
        productTitle: 'Test Widget',
        sellerIds: [IDS.SELLER],
        expectedDeliveryDate: '2026-08-01',
      })

    expect(res.status).toBe(400)
  })

  test('GET /groups – buyer receives grouped RFQ list', async () => {
    mockSubscribedBuyer()
    prisma.rfqGroup.findMany.mockResolvedValue([
      {
        id: RFQ_GROUP_ID,
        rfqNumber: RFQ_NUMBER,
        buyerId: IDS.BUYER,
        createdAt: new Date(),
        requests: [
          makeQuoteRow({ status: 'PENDING' }),
          makeQuoteRow({
            id: '99999999-9999-4999-8999-999999999999',
            sellerId: IDS.OTHER_SELLER,
            seller: { id: IDS.OTHER_SELLER, addresses: [{ city: 'Pune' }] },
          }),
        ],
      },
    ])

    const res = await agent
      .get('/api/quote-requests/groups')
      .set(cookieFor(buyerToken))

    expect(res.status).toBe(200)
    expect(res.body.data.items).toHaveLength(1)
    expect(res.body.data.items[0].sellerCount).toBe(2)
    expect(res.body.data.items[0].rfqNumber).toBe(RFQ_NUMBER)
  })

  test('GET /groups/:rfqGroupId – buyer comparison payload', async () => {
    mockSubscribedBuyer()
    prisma.rfqGroup.findFirst.mockResolvedValue({
      id: RFQ_GROUP_ID,
      rfqNumber: RFQ_NUMBER,
      buyerId: IDS.BUYER,
      createdAt: new Date(),
      requests: [
        makeQuoteRow({
          status: 'RESPONDED',
          sellerUnitPrice: { toString: () => '950.00' },
          sellerCurrency: 'INR',
          quoteValidUntil: new Date('2026-12-31'),
          sellerRespondedAt: new Date(),
        }),
        makeQuoteRow({
          id: '99999999-9999-4999-8999-999999999999',
          sellerId: IDS.OTHER_SELLER,
          status: 'PENDING',
          seller: { id: IDS.OTHER_SELLER, addresses: [{ city: 'Pune' }] },
        }),
      ],
    })

    const res = await agent
      .get(`/api/quote-requests/groups/${RFQ_GROUP_ID}`)
      .set(cookieFor(buyerToken))

    expect(res.status).toBe(200)
    expect(res.body.data.group.comparison).toHaveLength(2)
    expect(res.body.data.group.comparison[0].finalUnitPrice).toBeTruthy()
  })

  test('GET /stats – buyer stats buckets', async () => {
    mockSubscribedBuyer()
    prisma.quoteRequest.findMany.mockResolvedValue([
      makeQuoteRow({ status: 'PENDING' }),
      makeQuoteRow({
        id: '99999999-9999-4999-8999-999999999999',
        sellerId: IDS.OTHER_SELLER,
        status: 'RESPONDED',
        quoteValidUntil: new Date('2026-12-31'),
      }),
    ])

    const res = await agent
      .get('/api/quote-requests/stats?viewAs=buyer')
      .set(cookieFor(buyerToken))

    expect(res.status).toBe(200)
    expect(res.body.data.stats.myRfqs).toBe(1)
    expect(res.body.data.stats.totalQuotations).toBe(2)
  })

  test('GET /stats – seller stats buckets', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: IDS.SELLER, role: 'SELLER' })
    prisma.quoteRequest.findMany.mockResolvedValue([
      makeQuoteRow({ status: 'PENDING' }),
      makeQuoteRow({ id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', status: 'RESPONDED' }),
    ])

    const res = await agent
      .get('/api/quote-requests/stats?viewAs=seller')
      .set(cookieFor(sellerToken))

    expect(res.status).toBe(200)
    expect(res.body.data.stats.incoming).toBe(2)
    expect(res.body.data.stats.pendingResponses).toBe(1)
  })
})

describe('Quotation respond / accept APIs', () => {
  test('409 – seller cannot respond to closed quote', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: IDS.SELLER, role: 'SELLER' })
    prisma.subscription.findFirst.mockResolvedValue({ id: 'sub-seller' })
    prisma.quoteRequest.findUnique.mockResolvedValue({
      id: RFQ_ID,
      sellerId: IDS.SELLER,
      status: 'ACCEPTED',
    })

    const res = await agent
      .patch(`/api/quote-requests/${RFQ_ID}/respond`)
      .set(cookieFor(sellerToken))
      .send({ sellerUnitPrice: 100 })

    expect(res.status).toBe(409)
  })

  test('accept declines sibling quotations in the same RFQ group', async () => {
    mockSubscribedBuyer()

    const respondedQuote = makeQuoteRow({
      status: 'RESPONDED',
      sellerUnitPrice: { toString: () => '900.00' },
      quoteValidUntil: new Date('2026-12-31'),
    })

    prisma.quoteRequest.findUnique
      .mockResolvedValueOnce(respondedQuote)
      .mockResolvedValueOnce(respondedQuote)
    prisma.quoteRequest.findFirst.mockResolvedValue(null)

    prisma.product.findUnique.mockResolvedValue(makeProduct())
    prisma.product.findMany.mockResolvedValue([])
    prisma.order.findFirst.mockResolvedValue(null)
    prisma.order.create.mockResolvedValue({
      id: IDS.ORDER,
      orderNumber: 'ORD-TEST',
      status: 'PENDING',
      totalAmount: { toString: () => '4500.00' },
      createdAt: new Date(),
      items: [],
    })
    prisma.quoteRequest.update.mockResolvedValue({
      ...respondedQuote,
      status: 'ACCEPTED',
      orderId: IDS.ORDER,
    })
    prisma.quoteRequest.updateMany.mockResolvedValue({ count: 2 })

    const res = await agent
      .patch(`/api/quote-requests/${RFQ_ID}/accept`)
      .set(cookieFor(buyerToken))

    expect(res.status).toBe(200)
    expect(prisma.quoteRequest.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          rfqGroupId: RFQ_GROUP_ID,
          buyerId: IDS.BUYER,
          status: { in: ['PENDING', 'RESPONDED'] },
        }),
        data: expect.objectContaining({ status: 'DECLINED' }),
      }),
    )
    expect(res.body.data.declinedSiblingCount).toBe(2)
  })
})
