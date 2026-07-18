'use strict'

const { AppError } = require('../utils/AppError.js')
const { fetchMarketplaceSubscriptions } = require('./profileSubscriptionService.js')
const { buildMarketplaceCapabilities } = require('./marketplaceCapabilityService.js')

async function loadCapabilities(userId) {
  const subscriptions = await fetchMarketplaceSubscriptions(userId)
  return buildMarketplaceCapabilities(subscriptions)
}

async function assertBuyerDealCapability(user) {
  if (user.role === 'ADMIN') return
  const caps = await loadCapabilities(user.id)
  if (!caps.canViewBuyerOrders) {
    throw new AppError(
      'An active buyer subscription is required to access deals.',
      403,
      'SUBSCRIPTION_REQUIRED',
    )
  }
}

async function assertSellerDealCapability(user) {
  if (user.role === 'ADMIN') return
  const caps = await loadCapabilities(user.id)
  if (!caps.canViewSellerOrders) {
    throw new AppError(
      'An active seller subscription is required to access deals.',
      403,
      'SUBSCRIPTION_REQUIRED',
    )
  }
}

function assertBuyerDealOwnership(user, deal) {
  if (user.role === 'ADMIN') return
  if (!deal || deal.buyerId !== user.id) {
    throw new AppError('Deal not found.', 404, 'DEAL_NOT_FOUND')
  }
}

function assertSellerDealOwnership(user, deal) {
  if (user.role === 'ADMIN') return
  if (!deal || deal.sellerId !== user.id) {
    throw new AppError('Deal not found.', 404, 'DEAL_NOT_FOUND')
  }
}

function assertAdmin(user) {
  if (user.role !== 'ADMIN') {
    throw new AppError('Forbidden', 403, 'FORBIDDEN')
  }
}

module.exports = {
  loadCapabilities,
  assertBuyerDealCapability,
  assertSellerDealCapability,
  assertBuyerDealOwnership,
  assertSellerDealOwnership,
  assertAdmin,
}
