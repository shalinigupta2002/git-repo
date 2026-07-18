'use strict'

/**
 * @typedef {object} PortalProfile
 * @property {string|null} portalUserId
 * @property {string|null} fullName
 * @property {string|null} email
 * @property {string|null} phone
 * @property {string|null} company
 * @property {string|null} gst
 * @property {string|null} address
 * @property {string|null} city
 * @property {string|null} state
 * @property {string|null} country
 * @property {string|null} kycStatus
 * @property {string|null} profilePhoto
 */

/**
 * @typedef {object} ProviderProfileResult
 * @property {string} source
 * @property {boolean} mainPortalIntegrated
 * @property {PortalProfile|null} profile
 */

/**
 * @typedef {object} MarketplaceSubscriptionCard
 * @property {string|null} plan
 * @property {string|null} status
 * @property {string|null} startDate
 * @property {string|null} expiryDate
 */

/**
 * @typedef {object} MarketplaceCapabilities
 * @property {boolean} canBuy
 * @property {boolean} canSell
 * @property {boolean} buyerSubscriptionActive
 * @property {boolean} sellerSubscriptionActive
 * @property {boolean} hasAnySubscription
 * @property {boolean} hasActiveSubscription
 * @property {boolean} hasBuyerSubscription
 * @property {boolean} hasSellerSubscription
 * @property {boolean} canAccessBuyerDashboard
 * @property {boolean} canAccessSellerDashboard
 * @property {boolean} canCreateRFQ
 * @property {boolean} canSubmitQuotation
 * @property {boolean} canCreateProducts
 * @property {boolean} canViewProductCatalog
 * @property {boolean} canAcceptQuotation
 * @property {boolean} canRejectQuotation
 * @property {boolean} canViewOrders
 * @property {boolean} canCreateDeal
 * @property {boolean} canUnlockContact
 * @property {boolean} canViewReports
 */

/**
 * @typedef {object} ProfileViewResponse
 * @property {string} source
 * @property {boolean} mainPortalIntegrated
 * @property {string|null} manageProfileUrl
 * @property {PortalProfile|null} profile
 * @property {{ buyer: MarketplaceSubscriptionCard|null, seller: MarketplaceSubscriptionCard|null }} subscriptions
 * @property {MarketplaceCapabilities} marketplaceCapabilities
 */

module.exports = {}
