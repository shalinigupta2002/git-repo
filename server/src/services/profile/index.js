'use strict'

const env = require('../../config/env.js')
const { LocalDemoProfileProvider } = require('./LocalDemoProfileProvider.js')
const { MainPortalProfileProvider } = require('./MainPortalProfileProvider.js')

let cachedProvider = null

function getProfileProvider() {
  if (cachedProvider) return cachedProvider

  if (env.mainPortalProfileEnabled) {
    cachedProvider = new MainPortalProfileProvider()
  } else {
    cachedProvider = new LocalDemoProfileProvider()
  }

  return cachedProvider
}

/** Test helper — reset cached singleton */
function resetProfileProviderCache() {
  cachedProvider = null
}

module.exports = {
  getProfileProvider,
  resetProfileProviderCache,
  LocalDemoProfileProvider,
  MainPortalProfileProvider,
}
