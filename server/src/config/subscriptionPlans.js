/**
 * Subscription & bundle plan pricing (amounts in paise).
 * Bundle plans charge once and grant buyer + seller access together.
 */

const BASE_PLANS = {
  BUYER_MONTHLY:   { amountPaise: 99900,   expiresInDays: 28,   role: 'BUYER'  },
  BUYER_ANNUAL:    { amountPaise: 999900,  expiresInDays: 365,  role: 'BUYER'  },
  BUYER_LIFETIME:  { amountPaise: 4999900, expiresInDays: null, role: 'BUYER'  },
  SELLER_MONTHLY:  { amountPaise: 99900,   expiresInDays: 28,   role: 'SELLER' },
  SELLER_ANNUAL:   { amountPaise: 999900,  expiresInDays: 365,  role: 'SELLER' },
  SELLER_LIFETIME: { amountPaise: 4999900, expiresInDays: null, role: 'SELLER' },
}

/** @type {Record<string, { amountPaise: number, grants: Array<{ plan: string, expiresInDays: number|null }> }>} */
const BUNDLE_PLANS = {
  BOTH_MONTHLY: {
    amountPaise: 169900,
    grants: [
      { plan: 'BUYER_MONTHLY', expiresInDays: 28 },
      { plan: 'SELLER_MONTHLY', expiresInDays: 28 },
    ],
  },
  BOTH_ANNUAL: {
    amountPaise: 1699900,
    grants: [
      { plan: 'BUYER_ANNUAL', expiresInDays: 365 },
      { plan: 'SELLER_ANNUAL', expiresInDays: 365 },
    ],
  },
  BOTH_LIFETIME: {
    amountPaise: 7999900,
    grants: [
      { plan: 'BUYER_LIFETIME', expiresInDays: null },
      { plan: 'SELLER_LIFETIME', expiresInDays: null },
    ],
  },
}

/** Merged config passed to create-order / verify */
const PLAN_CONFIG = { ...BASE_PLANS }

for (const [bundleId, bundle] of Object.entries(BUNDLE_PLANS)) {
  PLAN_CONFIG[bundleId] = {
    amountPaise: bundle.amountPaise,
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
