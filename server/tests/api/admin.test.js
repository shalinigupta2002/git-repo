'use strict'

jest.mock('../../src/config/database')

const { agent, cookieFor, makeToken, IDS } = require('../../src/__tests__/helpers')
const { prisma } = require('../../src/config/database')

const buyerToken = makeToken({ id: IDS.BUYER, role: 'BUYER' })
const adminToken = makeToken({ id: IDS.ADMIN, role: 'ADMIN' })

describe('Admin APIs', () => {
  test('401 – admin stats without auth', async () => {
    const res = await agent.get('/api/admin/stats')
    expect(res.status).toBe(401)
  })

  test('403 – non-admin cannot access admin stats', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: IDS.BUYER, role: 'BUYER' })

    const res = await agent
      .get('/api/admin/stats')
      .set(cookieFor(buyerToken))

    expect(res.status).toBe(403)
  })

  test('200 – admin can access stats', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: IDS.ADMIN, role: 'ADMIN' })
    prisma.user.count.mockResolvedValue(10)
    prisma.product.count.mockResolvedValue(20)
    prisma.order.count.mockResolvedValue(5)
    prisma.order.aggregate.mockResolvedValue({
      _sum: { totalAmount: { toString: () => '1000.00' } },
    })

    const res = await agent
      .get('/api/admin/stats')
      .set(cookieFor(adminToken))

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.buyers).toBe(10)
  })
})
