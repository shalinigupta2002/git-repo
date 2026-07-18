'use strict'

/** @deprecated Transition alias — mirrors portalUserId for one release. */
function legacyMarketplaceIdAliases(portalUserId) {
  return {
    buyerMarketplaceId: portalUserId ?? null,
    sellerMarketplaceId: portalUserId ?? null,
  }
}

/**
 * Serializes a User row for API responses.
 * portalUserId is the public identity from Main Portal.
 */
function serializeUser(user) {
  if (!user) return null

  const portalUserId = user.portalUserId ?? null

  return {
    id: user.id,
    portalUserId,
    email: user.email,
    role: user.role,
    companyName: user.companyName ?? null,
    createdAt: user.createdAt,
    ...legacyMarketplaceIdAliases(portalUserId),
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
  portalUserId: true,
  buyerSubscriptionStatus: true,
  buyerSubscriptionPlan: true,
  buyerSubscriptionActivatedAt: true,
  sellerSubscriptionStatus: true,
  sellerSubscriptionPlan: true,
  sellerSubscriptionActivatedAt: true,
}

module.exports = { serializeUser, USER_SELECT, legacyMarketplaceIdAliases }
