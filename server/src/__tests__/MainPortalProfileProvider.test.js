'use strict'

const { MainPortalProfileProvider } = require('../services/profile/MainPortalProfileProvider.js')
const { unwrapProviderOutput } = require('../services/userProfileViewService.js')

describe('MainPortalProfileProvider', () => {
  test('returns interface-ready stub until Main Portal integration', async () => {
    const provider = new MainPortalProfileProvider()
    const result = await provider.getProfile('user-1')

    expect(result).toEqual({
      source: 'main_portal',
      mainPortalIntegrated: false,
      profile: null,
    })
  })

  test('unwraps stub result for orchestrator merge', async () => {
    const provider = new MainPortalProfileProvider()
    const result = await provider.getProfile('user-1')
    const unwrapped = unwrapProviderOutput(result, provider)

    expect(unwrapped.profile).toBeNull()
    expect(unwrapped.source).toBe('main_portal')
    expect(unwrapped.mainPortalIntegrated).toBe(false)
  })
})
