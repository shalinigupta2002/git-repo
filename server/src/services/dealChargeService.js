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
 * Seeds default configs for all V2 plans (Monthly, Annual, Lifetime).
 */
async function ensureDefaultDealChargeConfigs(client) {
  const defaults = [
    { id: 'setting-seller-monthly', audience: 'SELLER', planKey: 'SELLER_MONTHLY', displayName: 'Seller Monthly', value: new Prisma.Decimal('4.00'), chargeType: 'PERCENTAGE', currency: 'INR', isActive: true },
    { id: 'setting-seller-annual', audience: 'SELLER', planKey: 'SELLER_ANNUAL', displayName: 'Seller Annual', value: new Prisma.Decimal('3.00'), chargeType: 'PERCENTAGE', currency: 'INR', isActive: true },
    { id: 'setting-seller-lifetime', audience: 'SELLER', planKey: 'SELLER_LIFETIME', displayName: 'Seller Lifetime', value: new Prisma.Decimal('2.00'), chargeType: 'PERCENTAGE', currency: 'INR', isActive: true },
    { id: 'setting-buyer-monthly', audience: 'BUYER', planKey: 'BUYER_MONTHLY', displayName: 'Buyer Monthly', value: new Prisma.Decimal('5.00'), chargeType: 'PERCENTAGE', currency: 'INR', isActive: true },
    { id: 'setting-buyer-annual', audience: 'BUYER', planKey: 'BUYER_ANNUAL', displayName: 'Buyer Annual', value: new Prisma.Decimal('4.00'), chargeType: 'PERCENTAGE', currency: 'INR', isActive: true },
    { id: 'setting-buyer-lifetime', audience: 'BUYER', planKey: 'BUYER_LIFETIME', displayName: 'Buyer Lifetime', value: new Prisma.Decimal('3.00'), chargeType: 'PERCENTAGE', currency: 'INR', isActive: true },
    { id: 'setting-both-monthly', audience: 'BUYER', planKey: 'BOTH_MONTHLY', displayName: 'Both Monthly', value: new Prisma.Decimal('3.50'), chargeType: 'PERCENTAGE', currency: 'INR', isActive: true },
    { id: 'setting-both-annual', audience: 'BUYER', planKey: 'BOTH_ANNUAL', displayName: 'Both Annual', value: new Prisma.Decimal('2.50'), chargeType: 'PERCENTAGE', currency: 'INR', isActive: true },
    { id: 'setting-both-lifetime', audience: 'BUYER', planKey: 'BOTH_LIFETIME', displayName: 'Both Lifetime', value: new Prisma.Decimal('1.50'), chargeType: 'PERCENTAGE', currency: 'INR', isActive: true },
    
    // Legacy fallbacks for backward compatibility
    { id: 'setting-monthly', audience: 'SELLER', planKey: 'MONTHLY', displayName: 'Monthly', value: new Prisma.Decimal('4.00'), chargeType: 'PERCENTAGE', currency: 'INR', isActive: true },
    { id: 'setting-annual', audience: 'BUYER', planKey: 'ANNUAL', displayName: 'Annual', value: new Prisma.Decimal('4.00'), chargeType: 'PERCENTAGE', currency: 'INR', isActive: true },
    { id: 'setting-lifetime-buyer', audience: 'BUYER', planKey: 'LIFETIME', displayName: 'Lifetime', value: new Prisma.Decimal('3.00'), chargeType: 'PERCENTAGE', currency: 'INR', isActive: true },
    { id: 'setting-lifetime-seller', audience: 'SELLER', planKey: 'LIFETIME', displayName: 'Lifetime', value: new Prisma.Decimal('2.00'), chargeType: 'PERCENTAGE', currency: 'INR', isActive: true },
  ]

  for (const item of defaults) {
    await client.dealChargeConfig.upsert({
      where: {
        audience_planKey: {
          audience: item.audience,
          planKey: item.planKey,
        },
      },
      create: item,
      update: {
        displayName: item.displayName,
        isActive: true,
      },
    })
  }
}

/**
 * Ensures missing deal charges are calculated upon creation.
 * Frozen Deal Charge Rule: Historical deals preserve their frozen charge rate.
 */
async function recalculatePendingDealCharges(client, deal) {
  if (!deal || !deal.payments) return deal

  const unassignedPayments = deal.payments.filter((p) => !p.amount || Number(p.amount) === 0)
  if (unassignedPayments.length === 0) return deal

  let hasChanges = false

  for (const payment of unassignedPayments) {
    const role = payment.payerRole
    const userId = role === 'BUYER' ? deal.buyerId : deal.sellerId

    let planType
    try {
      planType = await resolveActivePlanType(client, userId, role)
    } catch (e) {
      logger.warn({ dealId: deal.id, userId, role, err: e.message }, 'Failed to resolve active subscription plan type')
      continue
    }

    const config = await findActiveChargeConfig(client, role, planType)
    const newAmount = calculateChargeAmount(config, deal.totalAmount)

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
  const activeBuyers = (await prisma.user.findMany({
    where: { buyerSubscriptionStatus: 'ACTIVE' },
    select: { buyerSubscriptionPlan: true },
  })) || []
  const activeSellers = (await prisma.user.findMany({
    where: { sellerSubscriptionStatus: 'ACTIVE' },
    select: { sellerSubscriptionPlan: true },
  })) || []

  const buyerType = resolveSubscriptionType(planKey, 'BUYER')
  const sellerType = resolveSubscriptionType(planKey, 'SELLER')
  const chargeType = buyerType || sellerType || planKey

  if (chargeType === 'MONTHLY') {
    return activeSellers.filter((s) => resolveSubscriptionType(s.sellerSubscriptionPlan, 'SELLER') === 'MONTHLY').length
  }
  if (chargeType === 'ANNUAL') {
    return activeBuyers.filter((b) => resolveSubscriptionType(b.buyerSubscriptionPlan, 'BUYER') === 'ANNUAL').length
  }
  if (chargeType === 'LIFETIME') {
    const buyerLft = activeBuyers.filter((b) => resolveSubscriptionType(b.buyerSubscriptionPlan, 'BUYER') === 'LIFETIME').length
    const sellerLft = activeSellers.filter((s) => resolveSubscriptionType(s.sellerSubscriptionPlan, 'SELLER') === 'LIFETIME').length
    return buyerLft + sellerLft
  }
  return 0
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
