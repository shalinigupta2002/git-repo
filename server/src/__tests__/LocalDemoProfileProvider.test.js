'use strict'

jest.mock('../config/database')

const { prisma } = require('../config/database')
const { LocalDemoProfileProvider } = require('../services/profile/LocalDemoProfileProvider.js')
const { resolveDemoProfile } = require('../services/profile/demoProfiles.js')

describe('LocalDemoProfileProvider', () => {
  const provider = new LocalDemoProfileProvider()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('returns catalog demo profile for known QA user', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'buyer.premium1@test.com',
      portalUserId: 'USR-DEMO-000001',
    })

    const profile = await provider.getProfile('u1')

    expect(profile).toEqual({
      portalUserId: 'USR-DEMO-000001',
      email: 'buyer.premium1@test.com',
      fullName: 'Ananya Mehta',
      phone: '9876510001',
      company: 'Premium Automation Buyer',
      gst: '19AABCU9603R1ZM',
      address: '12, Automation Trade Centre, Park Street Area',
      city: 'Kolkata',
      state: 'West Bengal',
      country: 'India',
      kycStatus: 'Verified',
      profilePhoto: null,
    })
  })

  test('does not use marketplace DB fields for profile content', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'buyer.premium1@test.com',
      portalUserId: 'USR-DEMO-000001',
    })

    const profile = await provider.getProfile('u1')

    expect(profile.company).toBe('Premium Automation Buyer')
    expect(profile.fullName).toBe('Ananya Mehta')
    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          email: true,
          portalUserId: true,
        }),
      }),
    )
  })

  test('injects portalUserId from identity link when catalog entry has none', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u2',
      email: 'buyer1@test.com',
      portalUserId: 'USR-DEMO-000099',
    })

    const profile = await provider.getProfile('u2')

    expect(profile.portalUserId).toBe('USR-DEMO-000099')
    expect(profile.fullName).toBe('Neha Agarwal')
  })

  test('generates fallback demo profile for unknown email', () => {
    const profile = resolveDemoProfile({
      email: 'new.user@test.com',
      portalUserId: null,
    })

    expect(profile.fullName).toBe('New User')
    expect(profile.email).toBe('new.user@test.com')
    expect(profile.company).toBe('New User Trading Co.')
    expect(profile.country).toBe('India')
    expect(profile.kycStatus).toBe('Pending verification')
  })

  test('returns null when user does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null)
    const profile = await provider.getProfile('missing')
    expect(profile).toBeNull()
  })
})
