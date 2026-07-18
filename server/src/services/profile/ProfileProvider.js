'use strict'

/**
 * Abstract profile provider — Main Portal is SSOT for identity fields.
 * Marketplace never implements subscription data here.
 */
class ProfileProvider {
  get sourceName() {
    return 'profile_provider'
  }

  get mainPortalIntegrated() {
    return false
  }

  /**
   * @param {string} userId Marketplace internal user UUID (identity link)
   * @returns {Promise<import('./profileTypes.js').PortalProfile|null|import('./profileTypes.js').ProviderProfileResult>}
   */
  async getProfile(_userId) {
    throw new Error('ProfileProvider.getProfile() is not implemented')
  }
}

module.exports = { ProfileProvider }
