'use strict'

jest.mock('../config/database')

const { Prisma } = require('@prisma/client')
const { prisma } = require('../config/database')
const {
  calculateChargeAmount,
  calculateDealCharge,
  findActiveChargeConfig,
} = require('../services/dealChargeService.js')

describe('dealChargeService', () => {
  const percentageConfig = {
    id: 'cfg-buyer',
    audience: 'BUYER',
    planKey: 'BUYER_LIFETIME',
    chargeType: 'PERCENTAGE',
    value: new Prisma.Decimal('2.5'),
    currency: 'INR',
    isActive: true,
  }

  const flatConfig = {
    id: 'cfg-seller',
    audience: 'SELLER',
    planKey: 'SELLER_LIFETIME',
    chargeType: 'FLAT',
    value: new Prisma.Decimal('500'),
    currency: 'INR',
    isActive: true,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('calculateChargeAmount applies percentage to total amount', () => {
    const amount = calculateChargeAmount(percentageConfig, new Prisma.Decimal('10000'))
    expect(amount.toString()).toBe('250')
  })

  test('calculateChargeAmount returns flat amount unchanged', () => {
    const amount = calculateChargeAmount(flatConfig, new Prisma.Decimal('10000'))
    expect(amount.toString()).toBe('500')
  })

  test('findActiveChargeConfig throws when config missing', async () => {
    prisma.dealChargeConfig.findFirst.mockResolvedValue(null)
    await expect(findActiveChargeConfig(prisma, 'BUYER', 'BUYER_GOLD')).rejects.toMatchObject({
      code: 'MISSING_CHARGE_CONFIG',
    })
  })

  test('calculateDealCharge returns immutable snapshot', async () => {
    prisma.subscription.findFirst.mockResolvedValue({ plan: 'BUYER_LIFETIME' })
    prisma.dealChargeConfig.findFirst.mockResolvedValue(percentageConfig)

    const result = await calculateDealCharge(prisma, {
      userId: 'buyer-1',
      audience: 'BUYER',
      totalAmount: new Prisma.Decimal('20000'),
      currency: 'INR',
    })

    expect(result.planKey).toBe('BUYER_LIFETIME')
    expect(result.amount.toString()).toBe('500')
    expect(result.configId).toBe('cfg-buyer')
    expect(Object.isFrozen(result)).toBe(true)
  })

  test('calculateDealCharge rejects inactive subscription', async () => {
    prisma.subscription.findFirst.mockResolvedValue(null)
    await expect(calculateDealCharge(prisma, {
      userId: 'buyer-1',
      audience: 'BUYER',
      totalAmount: new Prisma.Decimal('1000'),
    })).rejects.toMatchObject({ code: 'INACTIVE_SUBSCRIPTION' })
  })
})
