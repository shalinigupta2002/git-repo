/**
 * Subscription & bundle plan pricing (amounts in paise).
 * Bundle plans charge once and grant buyer + seller access together.
 */

const BASE_PLANS = {
  BUYER_STANDARD:  { amountPaise: 999900,  expiresInDays: null, role: 'BUYER'  },
  BUYER_LIFETIME:  { amountPaise: 4999900, expiresInDays: null, role: 'BUYER'  },
  SELLER_MONTH:    { amountPaise: 999900,  expiresInDays: 30,   role: 'SELLER' },
  SELLER_LIFETIME: { amountPaise: 4999900, expiresInDays: null, role: 'SELLER' },
}

/** @type {Record<string, { amountPaise: number, grants: Array<{ plan: string, expiresInDays: number|null }> }>} */
const BUNDLE_PLANS = {
  BOTH_STANDARD_MONTH: {
    grants: [
      { plan: 'BUYER_STANDARD', expiresInDays: null },
      { plan: 'SELLER_MONTH', expiresInDays: 30 },
    ],
  },
  BOTH_LIFETIME_LIFETIME: {
    grants: [
      { plan: 'BUYER_LIFETIME', expiresInDays: null },
      { plan: 'SELLER_LIFETIME', expiresInDays: null },
    ],
  },
  BOTH_LIFETIME_MONTH: {
    grants: [
      { plan: 'BUYER_LIFETIME', expiresInDays: null },
      { plan: 'SELLER_MONTH', expiresInDays: 30 },
    ],
  },
  BOTH_STANDARD_LIFETIME: {
    grants: [
      { plan: 'BUYER_STANDARD', expiresInDays: null },
      { plan: 'SELLER_LIFETIME', expiresInDays: null },
    ],
  },
}

function bundleAmountPaise(grants) {
  return grants.reduce((sum, g) => sum + BASE_PLANS[g.plan].amountPaise, 0)
}

/** Merged config passed to create-order / verify */
const PLAN_CONFIG = { ...BASE_PLANS }

for (const [bundleId, bundle] of Object.entries(BUNDLE_PLANS)) {
  PLAN_CONFIG[bundleId] = {
    amountPaise: bundleAmountPaise(bundle.grants),
    grants: bundle.grants,
    isBundle: true,
  }
}

function isBundlePlan(plan) {
  return Boolean(PLAN_CONFIG[plan]?.isBundle)
}

function grantsForPlan(plan) {
  const config = PLAN_CONFIG[plan]
  if (!config) return null
  if (config.isBundle) return config.grants
  return [{ plan, expiresInDays: config.expiresInDays ?? null }]
}

module.exports = {
  PLAN_CONFIG,
  BUNDLE_PLANS,
  BASE_PLANS,
  isBundlePlan,
  grantsForPlan,
}
