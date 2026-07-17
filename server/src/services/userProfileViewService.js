'use strict'

/**
 * Read-only profile view for the authenticated user.
 *
 * Architecture note: This service is the single integration point for profile
 * display data. When Main Portal is connected, swap `fetchLocalProfileView`
 * with a Main Portal API client — UI and routes stay unchanged.
 */

const { prisma } = require('../config/database.js')
const { USER_SELECT } = require('../utils/serializeUser.js')

const MAIN_PORTAL_PLACEHOLDER = 'Will be synced from Main Portal'

async function fetchDefaultAddress(userId) {
  return prisma.address.findFirst({
    where: { userId, isDefault: true },
    select: { city: true, phone: true, state: true },
    orderBy: { createdAt: 'asc' },
  })
}

function fieldValue(value) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return { value: null, display: MAIN_PORTAL_PLACEHOLDER, syncedFromMainPortal: false }
  }
  return { value, display: String(value), syncedFromMainPortal: false }
}

function buildWorkspaceSection(user, type, address) {
  const isBuyer = type === 'BUYER'
  const marketplaceId = isBuyer ? user.buyerMarketplaceId : user.sellerMarketplaceId
  const subscriptionStatus = isBuyer ? user.buyerSubscriptionStatus : user.sellerSubscriptionStatus
  const subscriptionPlan = isBuyer ? user.buyerSubscriptionPlan : user.sellerSubscriptionPlan

  return {
    marketplaceId: marketplaceId
      ? fieldValue(marketplaceId)
      : { value: null, display: 'No Marketplace ID Assigned', syncedFromMainPortal: false },
    subscriptionPlan: subscriptionPlan
      ? fieldValue(subscriptionPlan.replace(/_/g, ' '))
      : fieldValue(null),
    subscriptionStatus: subscriptionStatus
      ? fieldValue(subscriptionStatus)
      : fieldValue(null),
    city: address?.city ? fieldValue(address.city) : fieldValue(null),
    companyName: user.companyName ? fieldValue(user.companyName) : fieldValue(null),
    email: user.email ? fieldValue(user.email) : fieldValue(null),
    phone: address?.phone ? fieldValue(address.phone) : fieldValue(null),
  }
}

async function fetchLocalProfileView(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: USER_SELECT,
  })
  if (!user) return null

  const address = await fetchDefaultAddress(userId)

  return {
    source: 'marketplace_local',
    mainPortalIntegrated: false,
    buyer: buildWorkspaceSection(user, 'BUYER', address),
    seller: buildWorkspaceSection(user, 'SELLER', address),
  }
}

/**
 * Future: replace body with Main Portal API call.
 * @param {string} userId
 */
async function fetchProfileView(userId) {
  return fetchLocalProfileView(userId)
}

module.exports = {
  fetchProfileView,
  fetchLocalProfileView,
  MAIN_PORTAL_PLACEHOLDER,
}
