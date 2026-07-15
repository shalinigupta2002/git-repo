'use strict'

jest.mock('../../src/config/database')

const { agent, cookieFor, makeToken, IDS } = require('../../src/__tests__/helpers')
const { prisma } = require('../../src/config/database')

const buyerToken = makeToken({ id: IDS.BUYER, role: 'BUYER' })

describe('Subscription APIs', () => {
  test('401 – subscription status without auth', async () => {
    const res = await agent.get('/api/subscriptions/status')
    expect(res.status).toBe(401)
  })

  test('200 – authenticated user can read subscription status', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: IDS.BUYER, role: 'BUYER' })
    prisma.subscription.findMany.mockResolvedValue([])
    prisma.subscription.updateMany.mockResolvedValue({ count: 0 })

    const res = await agent
      .get('/api/subscriptions/status')
      .set(cookieFor(buyerToken))

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  test('400 – create-order rejects invalid plan body', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: IDS.BUYER, role: 'BUYER' })

    const res = await agent
      .post('/api/subscriptions/create-order')
      .set(cookieFor(buyerToken))
      .send({})

    expect(res.status).toBe(400)
  })
})
