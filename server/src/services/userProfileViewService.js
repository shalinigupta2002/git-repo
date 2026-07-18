'use strict'

/**
 * Pure orchestrator — merges Profile Provider output with Marketplace subscriptions.
 * Controllers call fetchProfileView() only; no business logic in controllers.
 */

const { getProfileProvider } = require('./profile/index.js')
const { fetchMarketplaceSubscriptions } = require('./profileSubscriptionService.js')
const { buildMarketplaceCapabilities } = require('./marketplaceCapabilityService.js')

function isProviderResult(value) {
  return Boolean(
    value
    && typeof value === 'object'
    && Object.prototype.hasOwnProperty.call(value, 'profile'),
  )
}

function unwrapProviderOutput(providerResult, provider) {
  if (isProviderResult(providerResult)) {
    return {
      profile: providerResult.profile ?? null,
      source: providerResult.source ?? provider.sourceName,
      mainPortalIntegrated: providerResult.mainPortalIntegrated ?? provider.mainPortalIntegrated,
    }
  }

  return {
    profile: providerResult ?? null,
    source: provider.sourceName,
    mainPortalIntegrated: provider.mainPortalIntegrated,
  }
}

async function fetchProfileView(userId) {
  const provider = getProfileProvider()

  const [providerResult, subscriptions] = await Promise.all([
    provider.getProfile(userId),
    fetchMarketplaceSubscriptions(userId),
  ])

  const { profile, source, mainPortalIntegrated } = unwrapProviderOutput(providerResult, provider)

  if (profile === null && source === 'demo_profile_provider') {
    return null
  }

  return {
    source,
    mainPortalIntegrated,
    manageProfileUrl: null,
    profile,
    subscriptions,
    marketplaceCapabilities: buildMarketplaceCapabilities(subscriptions),
  }
}

module.exports = {
  fetchProfileView,
  unwrapProviderOutput,
  isProviderResult,
}
