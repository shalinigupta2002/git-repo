'use strict'

const {
  serializeCounterpartyUser,
  buildPartyMetaFromRequest,
  maskCounterpartyProfile,
  buildFullPartyProfile,
  isProfileUnlocked,
} = require('../services/counterpartyProfileService.js')

const PRE_DEAL = { dealAccepted: false, dealChargesPaid: false }

const sampleBuyer = {
  id: 'uuid-buyer-internal',
  email: 'buyer@test.com',
  companyName: 'Acme Corp',
  portalUserId: 'USR-DEMO-000042',
  addresses: [{ city: 'Mumbai', state: 'MH', line1: 'Secret St', phone: '9999999999' }],
}

const sampleSeller = {
  id: 'uuid-seller-internal',
  email: 'seller@test.com',
  companyName: 'Seller Co',
  portalUserId: 'USR-DEMO-000007',
  addresses: [{ city: 'Delhi', state: 'DL', line1: 'Hidden Rd', phone: '8888888888' }],
}

describe('counterpartyProfileService', () => {
  describe('serializeCounterpartyUser', () => {
    it('exposes only portal user ID and city before deal unlock', () => {
      const profile = serializeCounterpartyUser(sampleSeller, 'SELLER', PRE_DEAL)
      expect(profile).toEqual({
        portalUserId: 'USR-DEMO-000007',
        marketplaceId: 'USR-DEMO-000007',
        city: 'Delhi',
        profileUnlocked: false,
      })
      expect(profile).not.toHaveProperty('email')
      expect(profile).not.toHaveProperty('id')
      expect(profile).not.toHaveProperty('companyName')
    })

    it('unlocks full profile after deal accepted and charges paid', () => {
      const profile = serializeCounterpartyUser(sampleBuyer, 'BUYER', {
        dealAccepted: true,
        dealChargesPaid: true,
      })
      expect(profile.portalUserId).toBe('USR-DEMO-000042')
      expect(profile.marketplaceId).toBe('USR-DEMO-000042')
      expect(profile.city).toBe('Mumbai')
      expect(profile.email).toBe('buyer@test.com')
      expect(profile.companyName).toBe('Acme Corp')
      expect(profile.profileUnlocked).toBe(true)
    })
  })

  describe('buildPartyMetaFromRequest', () => {
    it('does not include internal buyerId or sellerId UUIDs', () => {
      const meta = buildPartyMetaFromRequest(
        {
          rfqGroupId: 'group-1',
          rfqNumber: 'RFQ-2026-0001',
          buyerId: 'uuid-buyer-internal',
          sellerId: 'uuid-seller-internal',
          buyer: sampleBuyer,
          seller: sampleSeller,
          deliveryLocation: 'Mumbai',
          expectedDeliveryDate: null,
          attachments: [],
        },
        PRE_DEAL,
      )

      expect(meta.buyerPortalUserId).toBe('USR-DEMO-000042')
      expect(meta.sellerPortalUserId).toBe('USR-DEMO-000007')
      expect(meta.buyerMarketplaceId).toBe('USR-DEMO-000042')
      expect(meta.sellerMarketplaceId).toBe('USR-DEMO-000007')
      expect(meta.buyer).not.toHaveProperty('id')
      expect(meta.seller).not.toHaveProperty('id')
      expect(meta).not.toHaveProperty('buyerId')
      expect(meta).not.toHaveProperty('sellerId')
    })
  })

  describe('isProfileUnlocked', () => {
    it('requires both deal accepted and deal charges paid', () => {
      expect(isProfileUnlocked({ dealAccepted: true, dealChargesPaid: false })).toBe(false)
      expect(isProfileUnlocked({ dealAccepted: false, dealChargesPaid: true })).toBe(false)
      expect(isProfileUnlocked({ dealAccepted: true, dealChargesPaid: true })).toBe(true)
    })
  })

  describe('maskCounterpartyProfile', () => {
    it('strips empty optional fields from unlocked profile', () => {
      const full = buildFullPartyProfile(sampleSeller, 'SELLER')
      const masked = maskCounterpartyProfile(full, { dealAccepted: true, dealChargesPaid: true })
      expect(masked.gst).toBeUndefined()
      expect(masked.contactPerson).toBeUndefined()
    })
  })
})
