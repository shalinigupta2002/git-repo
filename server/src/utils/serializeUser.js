'use strict'

/**
 * Serializes a User row for API responses.
 * Marketplace identity fields are included when present on the record.
 */
function serializeUser(user) {
  if (!user) return null

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    companyName: user.companyName ?? null,
    createdAt: user.createdAt,
    buyerMarketplaceId: user.buyerMarketplaceId ?? null,
    sellerMarketplaceId: user.sellerMarketplaceId ?? null,
    buyerSubscriptionStatus: user.buyerSubscriptionStatus ?? null,
    buyerSubscriptionPlan: user.buyerSubscriptionPlan ?? null,
    buyerSubscriptionActivatedAt: user.buyerSubscriptionActivatedAt ?? null,
    sellerSubscriptionStatus: user.sellerSubscriptionStatus ?? null,
    sellerSubscriptionPlan: user.sellerSubscriptionPlan ?? null,
    sellerSubscriptionActivatedAt: user.sellerSubscriptionActivatedAt ?? null,
  }
}

const USER_SELECT = {
  id: true,
  email: true,
  role: true,
  companyName: true,
  createdAt: true,
  buyerMarketplaceId: true,
  sellerMarketplaceId: true,
  buyerSubscriptionStatus: true,
  buyerSubscriptionPlan: true,
  buyerSubscriptionActivatedAt: true,
  sellerSubscriptionStatus: true,
  sellerSubscriptionPlan: true,
  sellerSubscriptionActivatedAt: true,
}

module.exports = { serializeUser, USER_SELECT }
