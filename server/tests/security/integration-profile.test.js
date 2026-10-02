'use strict'

jest.mock('../../src/config/database')

const { IDS, agent, makeToken, cookieFor, makeUser } = require('../../src/__tests__/helpers')
const { prisma } = require('../../src/config/database')

const BUYER = makeUser()
const OTHER = makeUser({ id: IDS.OTHER_BUYER, email: 'other@test.com' })
const buyerToken = makeToken({ id: BUYER.id, email: BUYER.email, role: 'BUYER' })
const otherToken = makeToken({ id: OTHER.id, email: OTHER.email, role: 'BUYER' })

describe('Integration user profile authorization', () => {
  beforeEach(() => {
    prisma.user.findUnique.mockImplementation(({ where }) => {
      if (where.id === BUYER.id) {
        return Promise.resolve({
          id: BUYER.id,
          email: BUYER.email,
          role: 'BUYER',
          companyName: 'Buyer Co',
          isActive: true,
        })
      }
      if (where.id === OTHER.id) {
        return Promise.resolve({
          id: OTHER.id,
          email: OTHER.email,
          role: 'BUYER',
          companyName: 'Other Co',
          isActive: true,
        })
      }
      return Promise.resolve(null)
    })
  })

  test('403 when requesting another user profile', async () => {
    const res = await agent
      .get(`/api/v1/users/${BUYER.id}/profile`)
      .set(cookieFor(otherToken))

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  test('200 when requesting own profile', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({
      id: BUYER.id,
      email: BUYER.email,
      role: 'BUYER',
      companyName: 'Buyer Co',
      isActive: true,
    })

    const res = await agent
      .get(`/api/v1/users/${BUYER.id}/profile`)
      .set(cookieFor(buyerToken))

    expect(res.status).toBe(200)
    expect(res.body.data.userId).toBe(BUYER.id)
    expect(res.body.data).not.toHaveProperty('email')
  })
})

describe('Integration supplier profile negotiation gate', () => {
  test('403 when negotiation context verification fails', async () => {
    prisma.user.findUnique.mockResolvedValue(BUYER)

    const res = await agent
      .get(`/api/v1/suppliers/${IDS.SELLER}/profile`)
      .set(cookieFor(buyerToken))
      .set('X-Auction-Context-Id', 'not-a-valid-negotiation')

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('PII_ACCESS_DENIED')
  })
})
