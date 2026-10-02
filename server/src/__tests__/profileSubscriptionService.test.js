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
      const card = buildSubscriptionCard(null, 'SELLER_MONTHLY', 'EXPIRED')
      expect(card.plan).toBe('SELLER MONTHLY')
      expect(card.status).toBe('EXPIRED')
    })

    test('future startsAt clears ACTIVE status (not yet entitled)', () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-06-01T12:00:00Z'))
      const card = buildSubscriptionCard(
        {
          plan: 'BUYER_ANNUAL',
          status: 'ACTIVE',
          startsAt: new Date('2026-12-01'),
          expiresAt: new Date('2027-12-01'),
        },
        null,
        null,
      )
      expect(card.status).toBeNull()
      jest.useRealTimers()
    })
  })

  describe('formatPlanLabel', () => {
    test('formats enum plan names', () => {
      expect(formatPlanLabel('BOTH_STANDARD_MONTH')).toBe('BOTH STANDARD MONTH')
    })
  })
})
