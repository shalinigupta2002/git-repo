import { describe, expect, it } from 'vitest'
import { normalizeProfileView } from '../services/profile.service.js'

describe('normalizeProfileView', () => {
  it('maps hybrid API response into existing UI field contract', () => {
    const view = normalizeProfileView({
      source: 'demo_profile_provider',
      mainPortalIntegrated: false,
      manageProfileUrl: null,
      profile: {
        portalUserId: 'USR-DEMO-000001',
        fullName: 'Ananya Mehta',
        email: 'buyer.premium1@test.com',
        phone: '9876510001',
        company: 'Premium Automation Buyer',
        gst: '19AABCU9603R1ZM',
        address: '12, Automation Trade Centre',
        city: 'Kolkata',
        state: 'West Bengal',
        country: 'India',
        kycStatus: 'Verified',
        profilePhoto: null,
      },
      subscriptions: {
        buyer: {
          plan: 'BUYER LIFETIME',
          status: 'ACTIVE',
          startDate: '1 Jan 2026',
          expiryDate: 'Lifetime',
        },
        seller: null,
      },
      marketplaceCapabilities: {
        canViewProductCatalog: true,
        canSearchProducts: true,
        canViewProductDetails: true,
        canBuy: true,
        canSell: false,
        buyerSubscriptionActive: true,
        sellerSubscriptionActive: false,
        hasAnySubscription: true,
        hasActiveSubscription: true,
        hasBuyerSubscription: true,
        hasSellerSubscription: false,
        canAccessBuyerDashboard: true,
        canAccessSellerDashboard: false,
        canCreateRFQ: true,
        canSubmitQuotation: false,
        canCreateProducts: false,
        canEditProducts: false,
        canDeleteProducts: false,
        canAcceptQuotation: true,
        canRejectQuotation: true,
        canViewBuyerOrders: true,
        canViewSellerOrders: false,
        canTrackOrders: true,
        canCreateDeal: false,
        canUnlockContact: false,
        canViewReports: false,
      },
    })

    expect(view.profileInformation.fullName.display).toBe('Ananya Mehta')
    expect(view.profileInformation.portalUserId.display).toBe('USR-DEMO-000001')
    expect(view.profileInformation.mobileNumber.display).toBe('9876510001')
    expect(view.subscriptions.buyer.plan.display).toBe('BUYER LIFETIME')
    expect(view.marketplaceCapabilities?.canBuy).toBe(true)
    expect(view.marketplaceCapabilities?.canCreateRFQ).toBe(true)
  })
})
