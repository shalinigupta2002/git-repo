'use strict'

jest.mock('../../src/config/database', () => ({
  prisma: {
    deal: {
      count: jest.fn(),
    },
  },
}))

const { prisma } = require('../../src/config/database')
const { getPendingDealsCount } = require('../../src/services/dealChargeService')

describe('getPendingDealsCount', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prisma.deal.count.mockResolvedValue(2)
  })

  test('uses valid DealStatus enum values only', async () => {
    await getPendingDealsCount('setting-monthly')

    expect(prisma.deal.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: ['QUOTATION_ACCEPTED', 'DEAL_CREATED', 'PAYMENT_PENDING', 'ACTIVE', 'DISPUTED'] },
        }),
      }),
    )

    const call = prisma.deal.count.mock.calls[0][0]
    expect(JSON.stringify(call)).not.toContain('CONTACT_UNLOCKED')
  })
})
