'use strict'

const { ProfileProvider } = require('./ProfileProvider.js')

/**
 * Future Main Portal profile provider.
 *
 * Interface-ready stub — returns null profile until HTTP integration is wired.
 * TODO: Replace body with Main Portal API client call.
 * TODO: Map portal response into PortalProfile shape.
 * TODO: Set mainPortalIntegrated to true when portal responds successfully.
 */
class MainPortalProfileProvider extends ProfileProvider {
  get sourceName() {
    return 'main_portal'
  }

  get mainPortalIntegrated() {
    return false
  }

  /**
   * @returns {Promise<{ source: string, mainPortalIntegrated: boolean, profile: null }>}
   */
  async getProfile(_userId) {
    // TODO: const portalProfile = await mainPortalClient.fetchProfile(userId)
    // TODO: return { source: this.sourceName, mainPortalIntegrated: true, profile: mapPortalProfile(portalProfile) }
    return {
      source: this.sourceName,
      mainPortalIntegrated: false,
      profile: null,
    }
  }
}

module.exports = { MainPortalProfileProvider }
