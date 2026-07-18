'use strict'

const { prisma } = require('../../config/database.js')
const { ProfileProvider } = require('./ProfileProvider.js')
const { resolveDemoProfile } = require('./demoProfiles.js')

/** Identity link only — never used as profile field source. */
const USER_IDENTITY_SELECT = {
  id: true,
  email: true,
  portalUserId: true,
}

/**
 * Demo profile provider — returns profile data from demoProfiles.js only.
 * Marketplace DB is queried solely for authenticated identity mapping.
 */
class LocalDemoProfileProvider extends ProfileProvider {
  get sourceName() {
    return 'demo_profile_provider'
  }

  get mainPortalIntegrated() {
    return false
  }

  async getProfile(userId) {
    const identity = await prisma.user.findUnique({
      where: { id: userId },
      select: USER_IDENTITY_SELECT,
    })
    if (!identity) return null

    return resolveDemoProfile({
      userId: identity.id,
      email: identity.email,
      portalUserId: identity.portalUserId,
    })
  }
}

module.exports = { LocalDemoProfileProvider, USER_IDENTITY_SELECT }
