'use strict'

jest.mock('../config/database')

const { prisma } = require('../config/database')
const { allocateDealNumber } = require('../services/dealNumberService.js')

describe('dealNumberService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prisma.dealNumberCounter.upsert.mockResolvedValue({ year: 2026, lastValue: 1 })
  })

  test('generates DEAL-YYYY-NNNNNN format', async () => {
    prisma.dealNumberCounter.upsert.mockResolvedValue({ year: 2026, lastValue: 42 })
    await expect(allocateDealNumber()).resolves.toBe('DEAL-2026-000042')
  })

  test('pads sequence to six digits', async () => {
    prisma.dealNumberCounter.upsert.mockResolvedValue({ year: 2026, lastValue: 7 })
    await expect(allocateDealNumber()).resolves.toBe('DEAL-2026-000007')
  })

  test('uses transaction client when provided', async () => {
    const tx = { dealNumberCounter: { upsert: jest.fn().mockResolvedValue({ year: 2026, lastValue: 3 }) } }
    await expect(allocateDealNumber(tx)).resolves.toBe('DEAL-2026-000003')
    expect(tx.dealNumberCounter.upsert).toHaveBeenCalled()
    expect(prisma.dealNumberCounter.upsert).not.toHaveBeenCalled()
  })
})
