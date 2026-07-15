'use strict'

jest.mock('../../src/config/database')

const { agent, makeToken, cookieFor, IDS } = require('../../src/__tests__/helpers')
const { prisma } = require('../../src/config/database')

describe('Authentication middleware', () => {
  test('401 – quote-requests without cookie', async () => {
    const res = await agent.get('/api/quote-requests')
    expect(res.status).toBe(401)
  })

  test('401 – orders list without cookie', async () => {
    const res = await agent.get('/api/orders')
    expect(res.status).toBe(401)
  })

  test('401 – auth/me without cookie', async () => {
    const res = await agent.get('/api/auth/me')
    expect(res.status).toBe(401)
  })

  test('401 – invalid JWT cookie', async () => {
    const res = await agent
      .get('/api/auth/me')
      .set({ Cookie: 'auth_token=not-a-valid-jwt' })

    expect(res.status).toBe(401)
  })

  test('200 – valid JWT reaches protected quote-requests handler', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: IDS.BUYER,
      email: 'buyer@test.com',
      role: 'BUYER',
      companyName: 'Buyer Co',
    })
    prisma.subscription.findFirst.mockResolvedValue({ id: 'sub-001', status: 'ACTIVE' })
    prisma.quoteRequest.findMany.mockResolvedValue([])

    const token = makeToken({ id: IDS.BUYER, role: 'BUYER' })
    const res = await agent
      .get('/api/quote-requests?viewAs=buyer')
      .set(cookieFor(token))

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })
})
