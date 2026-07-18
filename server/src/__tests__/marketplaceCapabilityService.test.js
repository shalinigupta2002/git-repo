'use strict'

const {
  buildMarketplaceCapabilities,
  isSubscriptionActive,
} = require('../services/marketplaceCapabilityService.js')

/** Public browse + subscription metadata defaults (no active workspace access). */
const PUBLIC_CAPABILITIES = {
  canViewProductCatalog: true,
  canSearchProducts: true,
  canViewProductDetails: true,

  canBuy: false,
  canSell: false,

  canCreateRFQ: false,
  canAcceptQuotation: false,
  canRejectQuotation: false,

  canCreateProducts: false,
  canEditProducts: false,
  canDeleteProducts: false,

  canSubmitQuotation: false,

  canAccessBuyerDashboard: false,
  canAccessSellerDashboard: false,

  canViewBuyerOrders: false,
  canViewSellerOrders: false,

  canTrackOrders: false,

  canUnlockContact: false,
  canCreateDeal: false,
  canViewReports: false,

  hasBuyerSubscription: false,
  hasSellerSubscription: false,
  hasAnySubscription: false,
  hasActiveSubscription: false,

  buyerSubscriptionActive: false,
  sellerSubscriptionActive: false,
}

const NOT_IMPLEMENTED = {
  canUnlockContact: false,
  canCreateDeal: false,
  canViewReports: false,
}

describe('marketplaceCapabilityService', () => {
  describe('isSubscriptionActive', () => {
    test('returns true only for ACTIVE status', () => {
      expect(isSubscriptionActive({ status: 'ACTIVE' })).toBe(true)
      expect(isSubscriptionActive({ status: 'EXPIRED' })).toBe(false)
      expect(isSubscriptionActive({ status: 'CANCELLED' })).toBe(false)
      expect(isSubscriptionActive(null)).toBe(false)
    })
  })

  describe('buildMarketplaceCapabilities', () => {
    test('public user (no subscriptions) — catalog only', () => {
      expect(buildMarketplaceCapabilities({ buyer: null, seller: null })).toEqual(PUBLIC_CAPABILITIES)
      expect(buildMarketplaceCapabilities({})).toEqual(PUBLIC_CAPABILITIES)
    })

    test('buyer active — buyer workspace capabilities only', () => {
      const caps = buildMarketplaceCapabilities({
        buyer: { plan: 'BUYER LIFETIME', status: 'ACTIVE' },
        seller: null,
      })

      expect(caps).toEqual({
        ...PUBLIC_CAPABILITIES,
        canBuy: true,
        canCreateRFQ: true,
        canAcceptQuotation: true,
        canRejectQuotation: true,
        canAccessBuyerDashboard: true,
        canViewBuyerOrders: true,
        canTrackOrders: true,
        hasBuyerSubscription: true,
        hasAnySubscription: true,
        hasActiveSubscription: true,
        buyerSubscriptionActive: true,
      })
    })

    test('seller active — seller workspace capabilities only', () => {
      const caps = buildMarketplaceCapabilities({
        buyer: null,
        seller: { plan: 'SELLER LIFETIME', status: 'ACTIVE' },
      })

      expect(caps).toEqual({
        ...PUBLIC_CAPABILITIES,
        canSell: true,
        canCreateProducts: true,
        canEditProducts: true,
        canDeleteProducts: true,
        canSubmitQuotation: true,
        canAccessSellerDashboard: true,
        canViewSellerOrders: true,
        hasSellerSubscription: true,
        hasAnySubscription: true,
        hasActiveSubscription: true,
        sellerSubscriptionActive: true,
      })
    })

    test('both active — full buyer and seller capabilities', () => {
      const caps = buildMarketplaceCapabilities({
        buyer: { plan: 'BUYER LIFETIME', status: 'ACTIVE' },
        seller: { plan: 'SELLER LIFETIME', status: 'ACTIVE' },
      })

      expect(caps).toEqual({
        canViewProductCatalog: true,
        canSearchProducts: true,
        canViewProductDetails: true,

        canBuy: true,
        canSell: true,

        canCreateRFQ: true,
        canAcceptQuotation: true,
        canRejectQuotation: true,

        canCreateProducts: true,
        canEditProducts: true,
        canDeleteProducts: true,

        canSubmitQuotation: true,

        canAccessBuyerDashboard: true,
        canAccessSellerDashboard: true,

        canViewBuyerOrders: true,
        canViewSellerOrders: true,

        canTrackOrders: true,

        ...NOT_IMPLEMENTED,

        hasBuyerSubscription: true,
        hasSellerSubscription: true,
        hasAnySubscription: true,
        hasActiveSubscription: true,

        buyerSubscriptionActive: true,
        sellerSubscriptionActive: true,
      })
    })

    test('expired subscriptions — catalog public, records present, actions disabled', () => {
      const caps = buildMarketplaceCapabilities({
        buyer: { plan: 'BUYER STANDARD', status: 'EXPIRED' },
        seller: { plan: 'SELLER MONTH', status: 'EXPIRED' },
      })

      expect(caps).toEqual({
        ...PUBLIC_CAPABILITIES,
        hasBuyerSubscription: true,
        hasSellerSubscription: true,
        hasAnySubscription: true,
      })
    })

    test('buyer expired only — hasAnySubscription true, hasActiveSubscription false', () => {
      const caps = buildMarketplaceCapabilities({
        buyer: { plan: 'BUYER STANDARD', status: 'EXPIRED' },
        seller: null,
      })

      expect(caps.hasAnySubscription).toBe(true)
      expect(caps.hasActiveSubscription).toBe(false)
      expect(caps.hasBuyerSubscription).toBe(true)
      expect(caps.canBuy).toBe(false)
      expect(caps.canViewProductCatalog).toBe(true)
    })

    test('cancelled subscription — same as expired for capabilities', () => {
      const caps = buildMarketplaceCapabilities({
        buyer: { plan: 'BUYER STANDARD', status: 'CANCELLED' },
        seller: null,
      })

      expect(caps).toEqual({
        ...PUBLIC_CAPABILITIES,
        hasBuyerSubscription: true,
        hasAnySubscription: true,
      })
    })

    test('not-implemented features remain false even with both subscriptions active', () => {
      const caps = buildMarketplaceCapabilities({
        buyer: { plan: 'BUYER LIFETIME', status: 'ACTIVE' },
        seller: { plan: 'SELLER LIFETIME', status: 'ACTIVE' },
      })

      expect(caps).toMatchObject(NOT_IMPLEMENTED)
    })

    test('catalog visibility is always true for every subscription state', () => {
      const states = [
        {},
        { buyer: null, seller: null },
        { buyer: { status: 'EXPIRED' }, seller: null },
        { buyer: { status: 'ACTIVE' }, seller: null },
        { buyer: { status: 'ACTIVE' }, seller: { status: 'ACTIVE' } },
      ]

      for (const subscriptions of states) {
        const caps = buildMarketplaceCapabilities(subscriptions)
        expect(caps.canViewProductCatalog).toBe(true)
        expect(caps.canSearchProducts).toBe(true)
        expect(caps.canViewProductDetails).toBe(true)
      }
    })
  })
})
