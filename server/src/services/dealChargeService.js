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
 * Single source of truth for resolving subscription plans to one of:
 * - MONTHLY
 * - ANNUAL
 * - LIFETIME
 */
function resolveSubscriptionType(plan, audience) {
  if (!plan) return null

  let resolvedPlan = plan
  if (plan.startsWith('BOTH_')) {
    const { grantsForPlan } = require('../config/subscriptionPlans.js')
    const grants = grantsForPlan(plan) || []
    const match = grants.find((g) => {
      if (audience === 'BUYER') return g.plan.startsWith('BUYER_')
      if (audience === 'SELLER') return g.plan.startsWith('SELLER_')
      return false
    })
    if (match) {
      resolvedPlan = match.plan
    }
  }

  if (resolvedPlan === 'BUYER_STANDARD') return 'ANNUAL'
  if (resolvedPlan === 'BUYER_LIFETIME') return 'LIFETIME'
  if (resolvedPlan === 'SELLER_MONTH') return 'MONTHLY'
  if (resolvedPlan === 'SELLER_LIFETIME') return 'LIFETIME'

  return null
}

async function resolveActivePlanType(client, userId, audience) {
  const planKey = await resolveActivePlanKey(client, userId, audience)
  const planType = resolveSubscriptionType(planKey, audience)
  if (!planType) {
    throw new AppError(
      `Unable to map plan ${planKey} to a subscription type for audience ${audience}.`,
      500,
      'INVALID_PLAN_MAPPING',
    )
  }
  return planType
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
  const planType = await resolveActivePlanType(client, userId, audience)
  const config = await findActiveChargeConfig(client, audience, planType)
  const amount = calculateChargeAmount(config, totalAmount)

  const result = Object.freeze({
    audience,
    planKey: planType,
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
      planType,
      chargeType: config.chargeType,
      amount: amount.toString(),
    },
    'Deal charge calculated',
  )

  return result
}

/**
 * Seeds default configs for MONTHLY, ANNUAL, LIFETIME.
 */
async function ensureDefaultDealChargeConfigs(client) {
  const defaults = [
    { id: 'setting-monthly', audience: 'SELLER', planKey: 'MONTHLY', displayName: 'Monthly', value: new Prisma.Decimal('10.00'), chargeType: 'PERCENTAGE', currency: 'INR', isActive: true },
    { id: 'setting-annual', audience: 'BUYER', planKey: 'ANNUAL', displayName: 'Annual', value: new Prisma.Decimal('7.50'), chargeType: 'PERCENTAGE', currency: 'INR', isActive: true },
    { id: 'setting-lifetime-buyer', audience: 'BUYER', planKey: 'LIFETIME', displayName: 'Lifetime', value: new Prisma.Decimal('5.00'), chargeType: 'PERCENTAGE', currency: 'INR', isActive: true },
    { id: 'setting-lifetime-seller', audience: 'SELLER', planKey: 'LIFETIME', displayName: 'Lifetime', value: new Prisma.Decimal('5.00'), chargeType: 'PERCENTAGE', currency: 'INR', isActive: true },
  ]
  for (const item of defaults) {
    await client.dealChargeConfig.upsert({
      where: {
        audience_planKey: {
          audience: item.audience,
          planKey: item.planKey,
        }
      },
      create: item,
      update: {
        displayName: item.displayName,
        isActive: true,
      }
    })
  }

  // Deactivate old, non-standard configuration rows to prevent showing them in Admin UI
  await client.dealChargeConfig.updateMany({
    where: {
      planKey: { notIn: ['MONTHLY', 'ANNUAL', 'LIFETIME'] }
    },
    data: {
      isActive: false
    }
  })
}

/**
 * Dynamically recalculates any pending deal payments when fetched or processed.
 * Ensures unpaid deal charges are kept in sync with the latest admin settings.
 */
async function recalculatePendingDealCharges(client, deal) {
  if (!deal || !deal.payments) return deal

  const pendingPayments = deal.payments.filter((p) => p.paymentStatus === 'PENDING')
  if (pendingPayments.length === 0) return deal

  let hasChanges = false

  for (const payment of pendingPayments) {
    const role = payment.payerRole
    const userId = role === 'BUYER' ? deal.buyerId : deal.sellerId

    let planType
    try {
      planType = await resolveActivePlanType(client, userId, role)
    } catch (e) {
      logger.warn({ dealId: deal.id, userId, role, err: e.message }, 'Failed to resolve active subscription plan type during charge recalculation')
      continue
    }

    const config = await findActiveChargeConfig(client, role, planType)
    const newAmount = calculateChargeAmount(config, deal.totalAmount)

    const currentAmount = new Prisma.Decimal(payment.amount.toString())
    if (!newAmount.equals(currentAmount)) {
      hasChanges = true

      await client.dealPayment.update({
        where: { id: payment.id },
        data: { amount: newAmount },
      })

      const dealData = {}
      if (role === 'BUYER') {
        dealData.buyerDealCharge = newAmount
        dealData.buyerChargeConfigId = config.id
      } else {
        dealData.sellerDealCharge = newAmount
        dealData.sellerChargeConfigId = config.id
      }

      await client.deal.update({
        where: { id: deal.id },
        data: dealData,
      })
    }
  }

  if (hasChanges) {
    const { DEAL_API_INCLUDE } = require('./dealQueryService.js')
    return client.deal.findUnique({
      where: { id: deal.id },
      include: DEAL_API_INCLUDE,
    })
  }

  return deal
}

async function getSubscriberCount(planKey) {
  const { prisma } = require('../config/database.js')
  const activeBuyers = await prisma.user.findMany({
    where: { buyerSubscriptionStatus: 'ACTIVE' },
    select: { buyerSubscriptionPlan: true }
  })
  const activeSellers = await prisma.user.findMany({
    where: { sellerSubscriptionStatus: 'ACTIVE' },
    select: { sellerSubscriptionPlan: true }
  })

  let count = 0
  if (planKey === 'MONTHLY') {
    count = activeSellers.filter(s => resolveSubscriptionType(s.sellerSubscriptionPlan, 'SELLER') === 'MONTHLY').length
  } else if (planKey === 'ANNUAL') {
    count = activeBuyers.filter(b => resolveSubscriptionType(b.buyerSubscriptionPlan, 'BUYER') === 'ANNUAL').length
  } else if (planKey === 'LIFETIME') {
    const buyerLft = activeBuyers.filter(b => resolveSubscriptionType(b.buyerSubscriptionPlan, 'BUYER') === 'LIFETIME').length
    const sellerLft = activeSellers.filter(s => resolveSubscriptionType(s.sellerSubscriptionPlan, 'SELLER') === 'LIFETIME').length
    count = buyerLft + sellerLft
  }
  return count
}

async function getPendingDealsCount(configId) {
  const { prisma } = require('../config/database.js')
  return prisma.deal.count({
    where: {
      status: { in: ['QUOTATION_ACCEPTED', 'DEAL_CREATED', 'PAYMENT_PENDING', 'ACTIVE', 'DISPUTED'] },
      OR: [
        {
          buyerChargeConfigId: configId,
          payments: {
            some: {
              payerRole: 'BUYER',
              paymentStatus: 'PENDING',
            }
          }
        },
        {
          sellerChargeConfigId: configId,
          payments: {
            some: {
              payerRole: 'SELLER',
              paymentStatus: 'PENDING',
            }
          }
        }
      ]
    }
  })
}

module.exports = {
  BUYER_SUBSCRIPTION_PLANS,
  SELLER_SUBSCRIPTION_PLANS,
  plansForAudience,
  resolveActivePlanKey,
  resolveSubscriptionType,
  findActiveChargeConfig,
  calculateChargeAmount,
  calculateDealCharge,
  ensureDefaultDealChargeConfigs,
  recalculatePendingDealCharges,
  getSubscriberCount,
  getPendingDealsCount,
}
