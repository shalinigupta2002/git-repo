'use strict'

const {
  formatMarketplaceId,
  parseSequenceFromId,
  workspaceForPlan,
  ensureIdentityForPlan,
  ensureIdentityForGrants,
  syncDenormalizedSubscriptionFields,
} = require('../services/marketplaceIdentityService.js')

jest.mock('../config/env.js', () => ({
  isProd: false,
}))

describe('marketplaceIdentityService', () => {
  describe('formatMarketplaceId', () => {
    test('uses demo prefix in non-production', () => {
      expect(formatMarketplaceId('BUYER', 1)).toBe('BUY-DEMO-000001')
      expect(formatMarketplaceId('SELLER', 42)).toBe('SEL-DEMO-000042')
    })
  })

  describe('parseSequenceFromId', () => {
    test('parses demo and production formats', () => {
      expect(parseSequenceFromId('BUY-DEMO-000002', 'BUYER')).toBe(2)
      expect(parseSequenceFromId('SEL-000015', 'SELLER')).toBe(15)
      expect(parseSequenceFromId('invalid', 'BUYER')).toBe(0)
    })
  })

  describe('workspaceForPlan', () => {
    test('maps subscription plans to workspace', () => {
      expect(workspaceForPlan('BUYER_LIFETIME')).toBe('BUYER')
      expect(workspaceForPlan('SELLER_MONTH')).toBe('SELLER')
      expect(workspaceForPlan('BOTH_STANDARD_MONTH')).toBe(null)
    })
  })

  describe('ensureIdentityForPlan', () => {
    const tx = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      marketplaceIdCounter: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    }

    beforeEach(() => {
      jest.clearAllMocks()
      tx.user.findMany.mockResolvedValue([])
      tx.marketplaceIdCounter.findUnique.mockResolvedValue(null)
      tx.marketplaceIdCounter.upsert.mockResolvedValue({ type: 'BUYER', lastValue: 3 })
    })

    test('assigns new buyer marketplace ID once', async () => {
      tx.user.findUnique.mockResolvedValue({
        id: 'u1',
        buyerMarketplaceId: null,
        sellerMarketplaceId: null,
        buyerSubscriptionActivatedAt: null,
        sellerSubscriptionActivatedAt: null,
      })
      tx.user.update.mockResolvedValue({})

      const id = await ensureIdentityForPlan(tx, 'u1', 'BUYER_LIFETIME', 'ACTIVE')
      expect(id).toBe('BUY-DEMO-000003')
      expect(tx.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            buyerMarketplaceId: 'BUY-DEMO-000003',
            buyerSubscriptionStatus: 'ACTIVE',
            buyerSubscriptionPlan: 'BUYER_LIFETIME',
          }),
        }),
      )
    })

    test('never overwrites existing marketplace ID on renewal', async () => {
      tx.user.findUnique.mockResolvedValue({
        id: 'u1',
        buyerMarketplaceId: 'BUY-DEMO-000002',
        sellerMarketplaceId: null,
        buyerSubscriptionActivatedAt: new Date('2026-01-01'),
        sellerSubscriptionActivatedAt: null,
      })
      tx.user.update.mockResolvedValue({})

      const id = await ensureIdentityForPlan(tx, 'u1', 'BUYER_STANDARD', 'ACTIVE')
      expect(id).toBe('BUY-DEMO-000002')
      expect(tx.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            buyerSubscriptionStatus: 'ACTIVE',
            buyerSubscriptionPlan: 'BUYER_STANDARD',
          }),
        }),
      )
      expect(tx.user.update.mock.calls[0][0].data.buyerMarketplaceId).toBeUndefined()
      expect(tx.marketplaceIdCounter.upsert).not.toHaveBeenCalled()
    })
  })

  describe('ensureIdentityForGrants', () => {
    test('assigns buyer and seller IDs for bundle grants', async () => {
      const tx = {
        user: {
          findUnique: jest.fn()
            .mockResolvedValueOnce({
              id: 'u1',
              buyerMarketplaceId: null,
              sellerMarketplaceId: null,
              buyerSubscriptionActivatedAt: null,
              sellerSubscriptionActivatedAt: null,
            })
            .mockResolvedValueOnce({
              id: 'u1',
              buyerMarketplaceId: 'BUY-DEMO-000001',
              sellerMarketplaceId: null,
              buyerSubscriptionActivatedAt: new Date(),
              sellerSubscriptionActivatedAt: null,
            })
            .mockResolvedValueOnce({
              id: 'u1',
              buyerMarketplaceId: 'BUY-DEMO-000001',
              sellerMarketplaceId: null,
              buyerSubscriptionActivatedAt: new Date(),
              sellerSubscriptionActivatedAt: null,
            }),
          update: jest.fn().mockResolvedValue({}),
          findMany: jest.fn().mockResolvedValue([]),
        },
        marketplaceIdCounter: {
          findUnique: jest.fn().mockResolvedValue(null),
          upsert: jest.fn()
            .mockResolvedValueOnce({ type: 'BUYER', lastValue: 0 })
            .mockResolvedValueOnce({ type: 'BUYER', lastValue: 1 })
            .mockResolvedValueOnce({ type: 'SELLER', lastValue: 0 })
            .mockResolvedValueOnce({ type: 'SELLER', lastValue: 1 }),
        },
      }

      const result = await ensureIdentityForGrants(tx, 'u1', [
        { plan: 'BUYER_LIFETIME', status: 'ACTIVE' },
        { plan: 'SELLER_LIFETIME', status: 'ACTIVE' },
      ])

      expect(result.buyerMarketplaceId).toBe('BUY-DEMO-000001')
      expect(result.sellerMarketplaceId).toBe('SEL-DEMO-000001')
    })
  })

  describe('syncDenormalizedSubscriptionFields', () => {
    test('marks expired status without changing marketplace IDs', async () => {
      const client = {
        user: {
          findUnique: jest.fn().mockResolvedValue({
            buyerMarketplaceId: 'BUY-DEMO-000001',
            sellerMarketplaceId: null,
          }),
          update: jest.fn().mockResolvedValue({}),
        },
      }

      await syncDenormalizedSubscriptionFields(client, 'u1', {
        hasBuyerSub: false,
        hasSellerSub: false,
        buyerPlan: null,
        sellerPlan: null,
      })

      expect(client.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { buyerSubscriptionStatus: 'EXPIRED' },
      })
    })
  })
})
