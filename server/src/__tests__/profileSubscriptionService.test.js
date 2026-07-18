'use strict'

const {
  buildSubscriptionCard,
  formatPlanLabel,
} = require('../services/profileSubscriptionService.js')

describe('profileSubscriptionService', () => {
  describe('buildSubscriptionCard', () => {
    test('builds buyer subscription card from marketplace row', () => {
      const card = buildSubscriptionCard(
        {
          plan: 'BUYER_LIFETIME',
          status: 'ACTIVE',
          startsAt: new Date('2026-01-01'),
          expiresAt: null,
        },
        null,
        null,
      )

      expect(card).toEqual({
        plan: 'BUYER LIFETIME',
        status: 'ACTIVE',
        startDate: '1 Jan 2026',
        expiryDate: 'Lifetime',
      })
    })

    test('returns null when no subscription exists', () => {
      expect(buildSubscriptionCard(null, null, null)).toBeNull()
    })

    test('uses denormalized fallback when subscription row is missing', () => {
      const card = buildSubscriptionCard(null, 'SELLER_MONTH', 'EXPIRED')
      expect(card.plan).toBe('SELLER MONTH')
      expect(card.status).toBe('EXPIRED')
    })
  })

  describe('formatPlanLabel', () => {
    test('formats enum plan names', () => {
      expect(formatPlanLabel('BOTH_STANDARD_MONTH')).toBe('BOTH STANDARD MONTH')
    })
  })
})
