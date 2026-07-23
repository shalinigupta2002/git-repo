'use strict'

const { Prisma } = require('@prisma/client')
const { prisma } = require('../config/database.js')

const DEFAULT_V2_PLANS = [
  // SELLER PLANS
  {
    planKey: 'SELLER_MONTHLY',
    planName: 'Seller Monthly',
    role: 'SELLER',
    duration: 'MONTHLY',
    price: new Prisma.Decimal('999.00'),
    amountPaise: 99900,
    status: 'ACTIVE',
    displayOrder: 10,
    description: 'Monthly seller access for product listings, order management, and chat.',
    features: ['Unlimited Product Listings', 'Direct Buyer Inquiries & RFQs', 'Standard Support', 'Monthly Billing'],
    icon: 'store',
    badge: null,
  },
  {
    planKey: 'SELLER_ANNUAL',
    planName: 'Seller Annual',
    role: 'SELLER',
    duration: 'ANNUAL',
    price: new Prisma.Decimal('9999.00'),
    amountPaise: 999900,
    status: 'ACTIVE',
    displayOrder: 20,
    description: 'Annual seller membership with reduced deal charge rates and priority placement.',
    features: ['All Monthly Features', 'Reduced Platform Deal Charge (3%)', 'Priority Search Placement', 'Annual Savings'],
    icon: 'badge',
    badge: 'Most Popular',
  },
  {
    planKey: 'SELLER_LIFETIME',
    planName: 'Seller Lifetime',
    role: 'SELLER',
    duration: 'LIFETIME',
    price: new Prisma.Decimal('49999.00'),
    amountPaise: 4999900,
    status: 'ACTIVE',
    displayOrder: 30,
    description: 'One-time payment for permanent seller access with lowest deal charge rate (2%).',
    features: ['Permanent Lifetime Access', 'Lowest Deal Charge (2%)', 'VIP Supplier Badge', 'Zero Recurring Fees'],
    icon: 'crown',
    badge: 'Best Value',
  },

  // BUYER PLANS
  {
    planKey: 'BUYER_MONTHLY',
    planName: 'Buyer Monthly',
    role: 'BUYER',
    duration: 'MONTHLY',
    price: new Prisma.Decimal('999.00'),
    amountPaise: 99900,
    status: 'ACTIVE',
    displayOrder: 40,
    description: 'Monthly buyer membership to issue RFQs and review seller quotations.',
    features: ['Unlimited RFQ Submissions', 'Multi-Seller RFQ Comparison', 'Order Tracking', 'Monthly Flexibility'],
    icon: 'shopping-bag',
    badge: null,
  },
  {
    planKey: 'BUYER_ANNUAL',
    planName: 'Buyer Annual',
    role: 'BUYER',
    duration: 'ANNUAL',
    price: new Prisma.Decimal('9999.00'),
    amountPaise: 999900,
    status: 'ACTIVE',
    displayOrder: 50,
    description: 'Annual buyer access with lower deal charge rate and priority quotation routing.',
    features: ['All Monthly Features', 'Lower Deal Charge (4%)', 'Priority Seller Response', 'Annual Savings'],
    icon: 'shield-check',
    badge: 'Most Popular',
  },
  {
    planKey: 'BUYER_LIFETIME',
    planName: 'Buyer Lifetime',
    role: 'BUYER',
    duration: 'LIFETIME',
    price: new Prisma.Decimal('49999.00'),
    amountPaise: 4999900,
    status: 'ACTIVE',
    displayOrder: 60,
    description: 'One-time payment for lifetime procurement access and lowest deal charge (3%).',
    features: ['Permanent Lifetime Buying Access', 'Lowest Buyer Fee (3%)', 'Verified Buyer Badge', 'Zero Recurring Fees'],
    icon: 'sparkles',
    badge: 'Best Value',
  },

  // BOTH PLANS
  {
    planKey: 'BOTH_MONTHLY',
    planName: 'Buyer + Seller Monthly',
    role: 'BUYER', // Dual role capabilities
    duration: 'MONTHLY',
    price: new Prisma.Decimal('1699.00'),
    amountPaise: 169900,
    status: 'ACTIVE',
    displayOrder: 70,
    description: 'Full marketplace bundle for buying and selling on monthly terms.',
    features: ['Dual Buyer & Seller Workspace', 'Combined Dashboard Access', 'Flexible Monthly Billing'],
    icon: 'layers',
    badge: null,
  },
  {
    planKey: 'BOTH_ANNUAL',
    planName: 'Buyer + Seller Annual',
    role: 'BUYER',
    duration: 'ANNUAL',
    price: new Prisma.Decimal('16999.00'),
    amountPaise: 1699900,
    status: 'ACTIVE',
    displayOrder: 80,
    description: 'Full marketplace membership for one year at a bundled discount.',
    features: ['Full Marketplace Access', 'Reduced Deal Fees (2.5%)', 'Priority Support', 'Bundled Annual Discount'],
    icon: 'award',
    badge: 'Most Popular',
  },
  {
    planKey: 'BOTH_LIFETIME',
    planName: 'Buyer + Seller Lifetime',
    role: 'BUYER',
    duration: 'LIFETIME',
    price: new Prisma.Decimal('79999.00'),
    amountPaise: 7999900,
    status: 'ACTIVE',
    displayOrder: 90,
    description: 'Ultimate one-time membership granting lifetime access to both workspaces.',
    features: ['Permanent Lifetime Dual Access', 'Lowest Platform Deal Fees (1.5%)', 'VIP Marketplace Badge', 'Zero Recurring Fees'],
    icon: 'gem',
    badge: 'Ultimate Value',
  },
]

const LEGACY_KEY_MAP = Object.freeze({
  BUYER_STANDARD: 'BUYER_ANNUAL',
  BUYER_LIFETIME: 'BUYER_LIFETIME',
  SELLER_MONTH: 'SELLER_MONTHLY',
  SELLER_LIFETIME: 'SELLER_LIFETIME',
  BOTH_STANDARD_MONTH: 'BOTH_MONTHLY',
  BOTH_LIFETIME_LIFETIME: 'BOTH_LIFETIME',
  BOTH_LIFETIME_MONTH: 'BOTH_MONTHLY',
  BOTH_STANDARD_LIFETIME: 'BOTH_ANNUAL',
})

/** Seeds default 9 master plans into the DB if not already seeded. */
async function ensureDefaultMasterPlans(client = prisma) {
  try {
    await client.subscriptionPlanMaster.deleteMany({
      where: {
        planKey: {
          notIn: DEFAULT_V2_PLANS.map(p => p.planKey),
        },
      },
    })
  } catch (err) {
    // Table might not exist yet or connection error
  }

  for (const item of DEFAULT_V2_PLANS) {
    try {
      await client.subscriptionPlanMaster.upsert({
        where: { planKey: item.planKey },
        create: item,
        update: {
          planName: item.planName,
          displayOrder: item.displayOrder,
          price: item.price,
          amountPaise: item.amountPaise,
          description: item.description,
          features: item.features,
          icon: item.icon,
          badge: item.badge,
        },
      })
    } catch {
      // Table creation handled gracefully during schema migrations
    }
  }
}

/** Resolves any input key (legacy or V2) to canonical planKey string. */
function resolveCanonicalPlanKey(inputKey) {
  if (!inputKey || typeof inputKey !== 'string') return 'BUYER_ANNUAL'
  const trimmed = inputKey.trim()
  return LEGACY_KEY_MAP[trimmed] || trimmed
}

/** Lists active master subscription plans. */
async function listMasterPlans(query = {}) {
  await ensureDefaultMasterPlans()
  const where = {}
  if (query.role) where.role = query.role
  if (query.status) where.status = query.status

  return prisma.subscriptionPlanMaster.findMany({
    where,
    orderBy: { displayOrder: 'asc' },
  })
}

/** Gets single master plan by plan_key. */
async function getMasterPlanByKey(planKey) {
  await ensureDefaultMasterPlans()
  const canonicalKey = resolveCanonicalPlanKey(planKey)
  const plan = await prisma.subscriptionPlanMaster.findFirst({
    where: {
      OR: [
        { planKey: canonicalKey },
        { planKey: planKey },
      ],
    },
  })
  if (plan) return plan

  // Fallback to in-memory defaults if table query is empty
  const defaultMatch = DEFAULT_V2_PLANS.find(p => p.planKey === canonicalKey || p.planKey === planKey)
  return defaultMatch || DEFAULT_V2_PLANS[1]
}

/** Updates a master plan by plan_key. */
async function updateMasterPlan(planKey, payload, adminUserId) {
  const canonicalKey = resolveCanonicalPlanKey(planKey)
  const existing = await getMasterPlanByKey(canonicalKey)

  const data = {}
  if (payload.planName !== undefined) data.planName = payload.planName
  if (payload.price !== undefined) {
    data.price = new Prisma.Decimal(payload.price.toString())
    data.amountPaise = Math.round(Number(payload.price) * 100)
  }
  if (payload.description !== undefined) data.description = payload.description
  if (payload.features !== undefined) data.features = payload.features
  if (payload.badge !== undefined) data.badge = payload.badge
  if (payload.status !== undefined) data.status = payload.status
  if (payload.displayOrder !== undefined) data.displayOrder = payload.displayOrder

  const updated = await prisma.subscriptionPlanMaster.update({
    where: { planKey: existing.planKey },
    data,
  })

  const { writeAuditLog } = require('../utils/audit.js')
  await writeAuditLog({
    actorId: adminUserId,
    action: 'UPDATE',
    resource: 'subscription_plan_master',
    resourceId: updated.id,
    meta: {
      planKey: updated.planKey,
      previousPrice: existing.price?.toString(),
      newPrice: updated.price?.toString(),
    },
  })

  return updated
}

module.exports = {
  DEFAULT_V2_PLANS,
  LEGACY_KEY_MAP,
  ensureDefaultMasterPlans,
  resolveCanonicalPlanKey,
  listMasterPlans,
  getMasterPlanByKey,
  updateMasterPlan,
}
