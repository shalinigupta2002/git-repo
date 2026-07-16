/**
 * Combined "both" plans — one Razorpay payment unlocks buyer + seller access.
 */

/** @typedef {'month'|'lifetime'} SellerTier */
/** @typedef {'standard'|'lifetime'} BuyerTier */

/**
 * Maps UI tier choices to the server bundle plan id.
 * @param {{ sellerPlan?: SellerTier, buyerPlan?: BuyerTier }} opts
 */
export function bothBundlePlanId({ sellerPlan = 'month', buyerPlan = 'standard' } = {}) {
  const buyer = buyerPlan === 'lifetime' ? 'LIFETIME' : 'STANDARD'
  const seller = sellerPlan === 'lifetime' ? 'LIFETIME' : 'MONTH'
  return `BOTH_${buyer}_${seller}`
}

export function dashboardAfterBothComplete(role) {
  if (role === 'ADMIN') return '/admin'
  if (role === 'SELLER') return '/seller/dashboard'
  return '/buyer/dashboard'
}

/** @deprecated Two-step flow replaced by single bundle checkout */
export function bothFlowBuyerPath() {
  return '/pricing'
}

/** @deprecated Two-step flow replaced by single bundle checkout */
export function bothFlowSellerPath() {
  return '/pricing'
}
