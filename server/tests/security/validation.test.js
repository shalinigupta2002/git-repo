'use strict'

jest.mock('../../src/config/database')

const { agent, cookieFor, makeToken, IDS } = require('../../src/__tests__/helpers')
const { prisma } = require('../../src/config/database')

const buyerToken = makeToken({ id: IDS.BUYER, role: 'BUYER' })

describe('Validation and error handling', () => {
  test('400 – invalid UUID param on quote-requests/:id', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: IDS.BUYER, role: 'BUYER' })

    const res = await agent
      .get('/api/quote-requests/not-a-uuid')
      .set(cookieFor(buyerToken))

    expect(res.status).toBe(400)
  })

  test('400 – respond quote with invalid price', async () => {
    const sellerToken = makeToken({ id: IDS.SELLER, role: 'SELLER' })
    prisma.user.findUnique.mockResolvedValue({ id: IDS.SELLER, role: 'SELLER' })
    prisma.subscription.findFirst.mockResolvedValue({ id: 'sub-seller' })
    prisma.quoteRequest.findUnique.mockResolvedValue({
      id: '77777777-7777-4777-8777-777777777777',
      sellerId: IDS.SELLER,
      status: 'PENDING',
    })

    const res = await agent
      .patch('/api/quote-requests/77777777-7777-4777-8777-777777777777/respond')
      .set(cookieFor(sellerToken))
      .send({ sellerUnitPrice: -5 })

    expect(res.status).toBe(400)
  })

  test('404 – unknown API route returns structured not found', async () => {
    const res = await agent.get('/api/does-not-exist-route')
    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
  })
})
