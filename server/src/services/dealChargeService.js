'use strict'

const { Prisma } = require('@prisma/client')
const { AppError } = require('../utils/AppError.js')
const logger = require('../config/logger.js')

const BUYER_SUBSCRIPTION_PLANS = [
  'BUYER_STANDARD',
  'BUYER_LIFETIME',
  'BOTH_STANDARD_MONTH',
  'BOTH_LIFETIME_LIFETIME',
  'BOTH_LIFETIME_MONTH',
  'BOTH_STANDARD_LIFETIME',
]

const SELLER_SUBSCRIPTION_PLANS = [
  'SELLER_MONTH',
  'SELLER_LIFETIME',
  'BOTH_STANDARD_MONTH',
  'BOTH_LIFETIME_LIFETIME',
  'BOTH_LIFETIME_MONTH',
  'BOTH_STANDARD_LIFETIME',
]

function plansForAudience(audience) {
  if (audience === 'BUYER') return BUYER_SUBSCRIPTION_PLANS
  if (audience === 'SELLER') return SELLER_SUBSCRIPTION_PLANS
  throw new AppError(`Unknown charge audience: ${audience}`, 500, 'INVALID_AUDIENCE')
}

/**
 * Resolve the active subscription plan key for charge lookup.
 * @param {import('@prisma/client').Prisma.TransactionClient} client
 */
async function resolveActivePlanKey(client, userId, audience) {
  const now = new Date()
  const subscription = await client.subscription.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
      plan: { in: plansForAudience(audience) },
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    select: { plan: true },
  })

  if (!subscription) {
    throw new AppError(
      `Active ${audience.toLowerCase()} subscription is required for deal charges.`,
      403,
      'INACTIVE_SUBSCRIPTION',
    )
  }

  return subscription.plan
}

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} client
 */
async function findActiveChargeConfig(client, audience, planKey) {
  const config = await client.dealChargeConfig.findFirst({
    where: {
      audience,
      planKey,
      isActive: true,
    },
  })

  if (!config) {
    throw new AppError(
      `No active deal charge configuration for ${audience} plan ${planKey}.`,
      422,
      'MISSING_CHARGE_CONFIG',
    )
  }

  return config
}

function calculateChargeAmount(config, totalAmount) {
  const total = new Prisma.Decimal(totalAmount.toString())

  if (config.chargeType === 'PERCENTAGE') {
    const rate = new Prisma.Decimal(config.value.toString()).div(100)
    return total.mul(rate).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
  }

  return new Prisma.Decimal(config.value.toString()).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
}

/**
 * Calculate an immutable deal charge snapshot for one party.
 * @param {import('@prisma/client').Prisma.TransactionClient} client
 */
async function calculateDealCharge(client, { userId, audience, totalAmount, currency = 'INR' }) {
  const planKey = await resolveActivePlanKey(client, userId, audience)
  const config = await findActiveChargeConfig(client, audience, planKey)
  const amount = calculateChargeAmount(config, totalAmount)

  const result = Object.freeze({
    audience,
    planKey,
    configId: config.id,
    chargeType: config.chargeType,
    rate: config.value,
    amount,
    currency: config.currency || currency,
    totalAmount: new Prisma.Decimal(totalAmount.toString()),
  })

  logger.info(
    {
      userId,
      audience,
      planKey,
      chargeType: config.chargeType,
      amount: amount.toString(),
    },
    'Deal charge calculated',
  )

  return result
}

module.exports = {
  BUYER_SUBSCRIPTION_PLANS,
  SELLER_SUBSCRIPTION_PLANS,
  plansForAudience,
  resolveActivePlanKey,
  findActiveChargeConfig,
  calculateChargeAmount,
  calculateDealCharge,
}
