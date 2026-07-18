'use strict'

const {
  workspaceForPlan,
  syncSubscriptionFieldsForGrants,
  syncDenormalizedSubscriptionFields,
} = require('../services/subscriptionSyncService.js')

describe('subscriptionSyncService', () => {
  describe('workspaceForPlan', () => {
    test('maps subscription plans to workspace', () => {
      expect(workspaceForPlan('BUYER_LIFETIME')).toBe('BUYER')
      expect(workspaceForPlan('SELLER_MONTH')).toBe('SELLER')
      expect(workspaceForPlan('BOTH_STANDARD_MONTH')).toBe(null)
    })
  })

  describe('syncSubscriptionFieldsForGrants', () => {
    const tx = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    }

    beforeEach(() => {
      jest.clearAllMocks()
    })

    test('activates buyer subscription fields without allocating IDs', async () => {
      tx.user.findUnique.mockResolvedValue({
        buyerSubscriptionActivatedAt: null,
      })
      tx.user.update.mockResolvedValue({})

      await syncSubscriptionFieldsForGrants(tx, 'u1', [
        { plan: 'BUYER_LIFETIME', status: 'ACTIVE' },
      ])

      expect(tx.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            buyerSubscriptionStatus: 'ACTIVE',
            buyerSubscriptionPlan: 'BUYER_LIFETIME',
            buyerSubscriptionActivatedAt: expect.any(Date),
          }),
        }),
      )
      expect(tx.user.update.mock.calls[0][0].data.portalUserId).toBeUndefined()
    })

    test('does not reset activatedAt on renewal', async () => {
      const activatedAt = new Date('2026-01-01')
      tx.user.findUnique.mockResolvedValue({
        buyerSubscriptionActivatedAt: activatedAt,
      })
      tx.user.update.mockResolvedValue({})

      await syncSubscriptionFieldsForGrants(tx, 'u1', [
        { plan: 'BUYER_STANDARD', status: 'ACTIVE' },
      ])

      expect(tx.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            buyerSubscriptionStatus: 'ACTIVE',
            buyerSubscriptionPlan: 'BUYER_STANDARD',
          }),
        }),
      )
      expect(tx.user.update.mock.calls[0][0].data.buyerSubscriptionActivatedAt).toBeUndefined()
    })
  })

  describe('syncDenormalizedSubscriptionFields', () => {
    test('marks expired status when subscription lapses', async () => {
      const client = {
        user: {
          findUnique: jest.fn().mockResolvedValue({
            buyerSubscriptionActivatedAt: new Date('2026-01-01'),
            sellerSubscriptionActivatedAt: null,
            buyerSubscriptionStatus: 'ACTIVE',
            sellerSubscriptionStatus: null,
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
