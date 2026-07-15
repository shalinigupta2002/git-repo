'use strict'

jest.mock('../../src/config/database')

const { agent, cookieFor, makeToken, IDS } = require('../../src/__tests__/helpers')
const { prisma } = require('../../src/config/database')

describe('Security — protected routes', () => {
  test('seller cannot access buyer-only quote accept endpoint', async () => {
    const sellerToken = makeToken({ id: IDS.SELLER, role: 'SELLER' })
    prisma.user.findUnique.mockResolvedValue({ id: IDS.SELLER, role: 'SELLER' })

    const res = await agent
      .patch('/api/quote-requests/77777777-7777-4777-8777-777777777777/accept')
      .set(cookieFor(sellerToken))

    expect([403, 404, 400]).toContain(res.status)
  })

  test('buyer cannot access seller-only order status update', async () => {
    const buyerToken = makeToken({ id: IDS.BUYER, role: 'BUYER' })
    prisma.user.findUnique.mockResolvedValue({ id: IDS.BUYER, role: 'BUYER' })

    const res = await agent
      .patch('/api/orders/ffffffff-ffff-4fff-8fff-ffffffffffff/status')
      .set(cookieFor(buyerToken))
      .send({ status: 'CONFIRMED' })

    expect(res.status).toBe(403)
  })
})
