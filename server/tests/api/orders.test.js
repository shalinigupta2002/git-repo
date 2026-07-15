'use strict'

jest.mock('../../src/config/database')
jest.mock('../../src/utils/audit')

const { agent, cookieFor, makeToken, IDS } = require('../../src/__tests__/helpers')
const { prisma } = require('../../src/config/database')

const buyerToken = makeToken({ id: IDS.BUYER, role: 'BUYER' })

describe('Order APIs', () => {
  test('404 – direct POST /api/orders is disabled', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: IDS.BUYER, role: 'BUYER' })
    prisma.subscription.findFirst.mockResolvedValue({ id: 'sub-001' })

    const res = await agent
      .post('/api/orders')
      .set(cookieFor(buyerToken))
      .send({ items: [{ productId: IDS.PRODUCT, quantity: 1 }] })

    expect(res.status).toBe(404)
  })

  test('401 – list orders without auth', async () => {
    const res = await agent.get('/api/orders')
    expect(res.status).toBe(401)
  })

  test('200 – buyer can list own deals/orders', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: IDS.BUYER, role: 'BUYER' })
    prisma.order.findMany.mockResolvedValue([])
    prisma.order.count.mockResolvedValue(0)

    const res = await agent
      .get('/api/orders?scope=buyer')
      .set(cookieFor(buyerToken))

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data.orders)).toBe(true)
  })
})
