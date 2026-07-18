'use strict'

jest.mock('../config/database')
jest.mock('../services/profile/index.js', () => {
  const actual = jest.requireActual('../services/profile/index.js')
  return {
    ...actual,
    getProfileProvider: jest.fn(),
  }
})

const { prisma } = require('../config/database')
const { getProfileProvider } = require('../services/profile/index.js')
const { LocalDemoProfileProvider } = require('../services/profile/LocalDemoProfileProvider.js')
const { MainPortalProfileProvider } = require('../services/profile/MainPortalProfileProvider.js')
const { fetchProfileView } = require('../services/userProfileViewService.js')

describe('userProfileViewService (hybrid merge)', () => {
  const demoProvider = new LocalDemoProfileProvider()
  const portalProvider = new MainPortalProfileProvider()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('merges demo profile with marketplace subscriptions in flat response', async () => {
    getProfileProvider.mockReturnValue(demoProvider)
    jest.spyOn(demoProvider, 'getProfile').mockResolvedValue({
      portalUserId: 'USR-DEMO-000001',
      fullName: 'Ananya Mehta',
      email: 'buyer.premium1@test.com',
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

    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'buyer.premium1@test.com',
      portalUserId: 'USR-DEMO-000001',
      buyerSubscriptionPlan: 'BUYER_LIFETIME',
      buyerSubscriptionStatus: 'ACTIVE',
      sellerSubscriptionPlan: null,
      sellerSubscriptionStatus: null,
    })

    prisma.subscription.findMany.mockResolvedValue([
      {
        plan: 'BUYER_LIFETIME',
        status: 'ACTIVE',
        startsAt: new Date('2026-01-01'),
        expiresAt: null,
      },
    ])

    const view = await fetchProfileView('u1')

    expect(view).toEqual(
      expect.objectContaining({
        source: 'demo_profile_provider',
        mainPortalIntegrated: false,
        manageProfileUrl: null,
        profile: expect.objectContaining({
          fullName: 'Ananya Mehta',
          gst: '19AABCU9603R1ZM',
        }),
        subscriptions: expect.objectContaining({
          buyer: expect.objectContaining({ plan: 'BUYER LIFETIME' }),
          seller: null,
        }),
        marketplaceCapabilities: expect.objectContaining({
          canViewProductCatalog: true,
          canSearchProducts: true,
          canViewProductDetails: true,
          canBuy: true,
          canCreateRFQ: true,
          canAccessBuyerDashboard: true,
          buyerSubscriptionActive: true,
          sellerSubscriptionActive: false,
          hasAnySubscription: true,
          hasActiveSubscription: true,
          hasBuyerSubscription: true,
          hasSellerSubscription: false,
          canAcceptQuotation: true,
          canRejectQuotation: true,
          canViewBuyerOrders: true,
          canTrackOrders: true,
          canSell: false,
          canSubmitQuotation: false,
          canCreateProducts: false,
          canAccessSellerDashboard: false,
        }),
      }),
    )
    expect(view.profile.profile).toBeUndefined()
  })

  test('returns null when demo provider cannot resolve user', async () => {
    getProfileProvider.mockReturnValue(demoProvider)
    jest.spyOn(demoProvider, 'getProfile').mockResolvedValue(null)

    const view = await fetchProfileView('missing')
    expect(view).toBeNull()
  })

  test('returns subscriptions when Main Portal stub profile is null', async () => {
    getProfileProvider.mockReturnValue(portalProvider)

    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'buyer.premium1@test.com',
      portalUserId: 'USR-DEMO-000001',
      buyerSubscriptionPlan: 'BUYER_LIFETIME',
      buyerSubscriptionStatus: 'ACTIVE',
      sellerSubscriptionPlan: null,
      sellerSubscriptionStatus: null,
    })

    prisma.subscription.findMany.mockResolvedValue([
      {
        plan: 'BUYER_LIFETIME',
        status: 'ACTIVE',
        startsAt: new Date('2026-01-01'),
        expiresAt: null,
      },
    ])

    const view = await fetchProfileView('u1')

    expect(view.source).toBe('main_portal')
    expect(view.mainPortalIntegrated).toBe(false)
    expect(view.profile).toBeNull()
    expect(view.subscriptions.buyer.plan).toBe('BUYER LIFETIME')
    expect(view.marketplaceCapabilities).toEqual(
      expect.objectContaining({
        canBuy: true,
        buyerSubscriptionActive: true,
        hasAnySubscription: true,
        hasActiveSubscription: true,
      }),
    )
  })
})
