'use strict'

const { Prisma } = require('@prisma/client')
const { AppError } = require('../utils/AppError.js')
const logger = require('../config/logger.js')
const { resolveCanonicalPlanKey } = require('./subscriptionMasterService.js')

/** Public pricing-page plans — exactly one deal charge config each. */
const PUBLIC_DEAL_CHARGE_PLAN_KEYS = Object.freeze([
  'BUYER_MONTHLY',
  'BUYER_ANNUAL',
  'BUYER_LIFETIME',
  'SELLER_MONTHLY',
  'SELLER_ANNUAL',
  'SELLER_LIFETIME',
  'BOTH_MONTHLY',
  'BOTH_ANNUAL',
  'BOTH_LIFETIME',
])

const LEGACY_SUBSCRIPTION_PLANS = Object.freeze([
  'BUYER_STANDARD',
  'SELLER_MONTH',
  'BOTH_STANDARD_MONTH',
  'BOTH_LIFETIME_LIFETIME',
  'BOTH_LIFETIME_MONTH',
  'BOTH_STANDARD_LIFETIME',
])

const ALL_SUBSCRIPTION_PLANS = Object.freeze([
  ...PUBLIC_DEAL_CHARGE_PLAN_KEYS,
  ...LEGACY_SUBSCRIPTION_PLANS,
])

const BUYER_SUBSCRIPTION_PLANS = ALL_SUBSCRIPTION_PLANS.filter(
  (plan) => plan.startsWith('BUYER_') || plan.startsWith('BOTH_'),
)

const SELLER_SUBSCRIPTION_PLANS = ALL_SUBSCRIPTION_PLANS.filter(
  (plan) => plan.startsWith('SELLER_') || plan.startsWith('BOTH_'),
)

function plansForAudience(audience) {
  if (audience === 'BUYER') return BUYER_SUBSCRIPTION_PLANS
  if (audience === 'SELLER') return SELLER_SUBSCRIPTION_PLANS
  throw new AppError(`Unknown charge audience: ${audience}`, 500, 'INVALID_AUDIENCE')
}

function planAppliesToAudience(planKey, audience) {
  const canonical = resolveCanonicalPlanKey(planKey)
  if (canonical.startsWith('BOTH_')) return true
  if (audience === 'BUYER' && canonical.startsWith('BUYER_')) return true
  if (audience === 'SELLER' && canonical.startsWith('SELLER_')) return true
  return false
}

/**
 * Resolve the active subscription plan key for deal charge lookup.
 * @param {import('@prisma/client').Prisma.TransactionClient} client
 */
async function resolveActivePlanKey(client, userId, audience) {
  const now = new Date()
  const subscriptions = await client.subscription.findMany({
    where: {
      userId,
      status: 'ACTIVE',
      plan: { in: ALL_SUBSCRIPTION_PLANS },
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    select: { plan: true },
  })

  for (const subscription of subscriptions) {
    const canonical = resolveCanonicalPlanKey(subscription.plan)
    if (planAppliesToAudience(canonical, audience)) {
      return canonical
    }
  }

  throw new AppError(
    `Active ${audience.toLowerCase()} subscription is required for deal charges.`,
    403,
    'INACTIVE_SUBSCRIPTION',
  )
}

/**
 * Legacy helper — maps any plan key to MONTHLY | ANNUAL | LIFETIME for admin analytics.
 * Kept for backward compatibility with existing admin reporting.
 */
function resolveSubscriptionType(plan, audience) {
  if (!plan) return null

  const canonical = resolveCanonicalPlanKey(plan)
  if (canonical.endsWith('_MONTHLY')) return 'MONTHLY'
  if (canonical.endsWith('_ANNUAL')) return 'ANNUAL'
  if (canonical.endsWith('_LIFETIME')) return 'LIFETIME'

  if (canonical === 'MONTHLY' || canonical === 'ANNUAL' || canonical === 'LIFETIME') {
    return canonical
  }

  return null
}

async function resolveActiveChargePlanKey(client, userId, audience) {
  return resolveActivePlanKey(client, userId, audience)
}

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} client
 */
async function findActiveChargeConfig(client, audience, planKey) {
  const canonical = resolveCanonicalPlanKey(planKey)
  const where = {
    planKey: canonical,
    isActive: true,
  }

  if (!canonical.startsWith('BOTH_')) {
    where.audience = audience
  }

  const config = await client.dealChargeConfig.findFirst({ where })

  if (!config) {
    throw new AppError(
      `No active deal charge configuration for plan ${canonical}.`,
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
  const chargePlanKey = await resolveActiveChargePlanKey(client, userId, audience)
  const config = await findActiveChargeConfig(client, audience, chargePlanKey)
  const amount = calculateChargeAmount(config, totalAmount)

  const result = Object.freeze({
    audience,
    planKey: chargePlanKey,
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
      chargePlanKey,
      chargeType: config.chargeType,
      amount: amount.toString(),
    },
    'Deal charge calculated',
  )

  return result
}

const DEFAULT_PUBLIC_CHARGE_CONFIGS = [
  { id: 'setting-buyer-monthly', audience: 'BUYER', planKey: 'BUYER_MONTHLY', displayName: 'Buyer Monthly', value: new Prisma.Decimal('5.00'), chargeType: 'PERCENTAGE', currency: 'INR', isActive: true },
  { id: 'setting-buyer-annual', audience: 'BUYER', planKey: 'BUYER_ANNUAL', displayName: 'Buyer Annual', value: new Prisma.Decimal('4.00'), chargeType: 'PERCENTAGE', currency: 'INR', isActive: true },
  { id: 'setting-buyer-lifetime', audience: 'BUYER', planKey: 'BUYER_LIFETIME', displayName: 'Buyer Lifetime', value: new Prisma.Decimal('3.00'), chargeType: 'PERCENTAGE', currency: 'INR', isActive: true },
  { id: 'setting-seller-monthly', audience: 'SELLER', planKey: 'SELLER_MONTHLY', displayName: 'Seller Monthly', value: new Prisma.Decimal('4.00'), chargeType: 'PERCENTAGE', currency: 'INR', isActive: true },
  { id: 'setting-seller-annual', audience: 'SELLER', planKey: 'SELLER_ANNUAL', displayName: 'Seller Annual', value: new Prisma.Decimal('3.00'), chargeType: 'PERCENTAGE', currency: 'INR', isActive: true },
  { id: 'setting-seller-lifetime', audience: 'SELLER', planKey: 'SELLER_LIFETIME', displayName: 'Seller Lifetime', value: new Prisma.Decimal('2.00'), chargeType: 'PERCENTAGE', currency: 'INR', isActive: true },
  { id: 'setting-both-monthly', audience: 'BUYER', planKey: 'BOTH_MONTHLY', displayName: 'Both Monthly', value: new Prisma.Decimal('3.50'), chargeType: 'PERCENTAGE', currency: 'INR', isActive: true },
  { id: 'setting-both-annual', audience: 'BUYER', planKey: 'BOTH_ANNUAL', displayName: 'Both Annual', value: new Prisma.Decimal('2.50'), chargeType: 'PERCENTAGE', currency: 'INR', isActive: true },
  { id: 'setting-both-lifetime', audience: 'BUYER', planKey: 'BOTH_LIFETIME', displayName: 'Both Lifetime', value: new Prisma.Decimal('1.50'), chargeType: 'PERCENTAGE', currency: 'INR', isActive: true },
]

/**
 * Seeds the 9 public deal charge configs and hides deprecated rows from admin UI.
 */
async function ensureDefaultDealChargeConfigs(client) {
  for (const item of DEFAULT_PUBLIC_CHARGE_CONFIGS) {
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

  await client.dealChargeConfig.updateMany({
    where: {
      planKey: { notIn: [...PUBLIC_DEAL_CHARGE_PLAN_KEYS] },
    },
    data: { isActive: false },
  })
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

    let chargePlanKey
    try {
      chargePlanKey = await resolveActiveChargePlanKey(client, userId, role)
    } catch (e) {
      logger.warn({ dealId: deal.id, userId, role, err: e.message }, 'Failed to resolve active subscription plan type')
      continue
    }

    const config = await findActiveChargeConfig(client, role, chargePlanKey)
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

function countPlansMatching(users, planField, targetPlanKey) {
  const canonicalTarget = resolveCanonicalPlanKey(targetPlanKey)
  return users.filter((user) => resolveCanonicalPlanKey(user[planField]) === canonicalTarget).length
}

async function getSubscriberCount(planKey) {
  const { prisma } = require('../config/database.js')
  const canonical = resolveCanonicalPlanKey(planKey)

  const activeBuyers = (await prisma.user.findMany({
    where: { buyerSubscriptionStatus: 'ACTIVE' },
    select: { buyerSubscriptionPlan: true },
  })) || []
  const activeSellers = (await prisma.user.findMany({
    where: { sellerSubscriptionStatus: 'ACTIVE' },
    select: { sellerSubscriptionPlan: true },
  })) || []

  if (canonical.startsWith('BOTH_')) {
    const buyerMatches = countPlansMatching(activeBuyers, 'buyerSubscriptionPlan', canonical)
    const sellerMatches = countPlansMatching(activeSellers, 'sellerSubscriptionPlan', canonical)
    return buyerMatches + sellerMatches
  }

  if (canonical.startsWith('BUYER_')) {
    return countPlansMatching(activeBuyers, 'buyerSubscriptionPlan', canonical)
  }

  if (canonical.startsWith('SELLER_')) {
    return countPlansMatching(activeSellers, 'sellerSubscriptionPlan', canonical)
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
            },
          },
        },
        {
          sellerChargeConfigId: configId,
          payments: {
            some: {
              payerRole: 'SELLER',
              paymentStatus: 'PENDING',
            },
          },
        },
      ],
    },
  })
}

module.exports = {
  PUBLIC_DEAL_CHARGE_PLAN_KEYS,
  BUYER_SUBSCRIPTION_PLANS,
  SELLER_SUBSCRIPTION_PLANS,
  plansForAudience,
  resolveActivePlanKey,
  resolveActiveChargePlanKey,
  resolveSubscriptionType,
  findActiveChargeConfig,
  calculateChargeAmount,
  calculateDealCharge,
  ensureDefaultDealChargeConfigs,
  recalculatePendingDealCharges,
  getSubscriberCount,
  getPendingDealsCount,
}
