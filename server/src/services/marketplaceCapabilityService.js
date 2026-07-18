'use strict'

/**
 * Marketplace capability flags derived from subscription state.
 * FINAL permission model — single backend source of truth.
 * Frontend must rely on marketplaceCapabilities only; do not re-derive these rules.
 */

function isSubscriptionActive(card) {
  return Boolean(card && card.status === 'ACTIVE')
}

/**
 * @param {{ buyer: object|null, seller: object|null }} subscriptions
 * @returns {import('./profile/profileTypes.js').MarketplaceCapabilities}
 */
function buildMarketplaceCapabilities(subscriptions = {}) {
  const buyerCard = subscriptions.buyer ?? null
  const sellerCard = subscriptions.seller ?? null

  const buyerSubscriptionActive = isSubscriptionActive(buyerCard)
  const sellerSubscriptionActive = isSubscriptionActive(sellerCard)

  const hasBuyerSubscription = Boolean(buyerCard)
  const hasSellerSubscription = Boolean(sellerCard)
  const hasAnySubscription = hasBuyerSubscription || hasSellerSubscription
  const hasActiveSubscription = buyerSubscriptionActive || sellerSubscriptionActive

  return {
    // Public catalog — always available regardless of subscription
    canViewProductCatalog: true,
    canSearchProducts: true,
    canViewProductDetails: true,

    canBuy: buyerSubscriptionActive,
    canSell: sellerSubscriptionActive,

    canCreateRFQ: buyerSubscriptionActive,
    canAcceptQuotation: buyerSubscriptionActive,
    canRejectQuotation: buyerSubscriptionActive,

    canCreateProducts: sellerSubscriptionActive,
    canEditProducts: sellerSubscriptionActive,
    canDeleteProducts: sellerSubscriptionActive,

    canSubmitQuotation: sellerSubscriptionActive,

    canAccessBuyerDashboard: buyerSubscriptionActive,
    canAccessSellerDashboard: sellerSubscriptionActive,

    canViewBuyerOrders: buyerSubscriptionActive,
    canViewSellerOrders: sellerSubscriptionActive,

    canTrackOrders: buyerSubscriptionActive,

    // Not implemented — frozen false until business ships features
    canUnlockContact: false,
    canCreateDeal: false,
    canViewReports: false,

    hasBuyerSubscription,
    hasSellerSubscription,
    hasAnySubscription,
    hasActiveSubscription,

    buyerSubscriptionActive,
    sellerSubscriptionActive,
  }
}

module.exports = {
  buildMarketplaceCapabilities,
  isSubscriptionActive,
}
