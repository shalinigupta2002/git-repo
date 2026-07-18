import { describe, expect, it } from 'vitest'
import {
  buildDealListParams,
  canPayDealCharge,
  describeTimelineEvent,
  formatDealAmount,
  getDealPayment,
  isDealContactUnlocked,
  isWaitingForCounterpartyPayment,
  sortTimelineEvents,
} from '../utils/dealHelpers.js'
import {
  isCounterpartyProfileUnlocked,
  maskCounterpartyProfile,
} from '../utils/counterpartyProfile.js'

const sampleDeal = {
  status: 'PAYMENT_PENDING',
  contactUnlockStatus: 'LOCKED',
  currency: 'INR',
  buyerDealCharge: '90',
  sellerDealCharge: '90',
  payments: [
    { payerRole: 'BUYER', paymentStatus: 'PENDING', amount: '90', currency: 'INR' },
    { payerRole: 'SELLER', paymentStatus: 'PENDING', amount: '90', currency: 'INR' },
  ],
}

describe('dealHelpers', () => {
  it('formats INR amounts', () => {
    expect(formatDealAmount('4500', 'INR')).toMatch(/4,500/)
  })

  it('finds payment by role', () => {
    expect(getDealPayment(sampleDeal, 'BUYER')?.paymentStatus).toBe('PENDING')
  })

  it('detects when buyer can pay', () => {
    expect(canPayDealCharge(sampleDeal, 'BUYER')).toBe(true)
  })

  it('detects waiting for counterparty payment', () => {
    const deal = {
      ...sampleDeal,
      payments: [
        { payerRole: 'BUYER', paymentStatus: 'SUCCESS' },
        { payerRole: 'SELLER', paymentStatus: 'PENDING' },
      ],
    }
    expect(isWaitingForCounterpartyPayment(deal, 'BUYER')).toBe(true)
  })

  it('builds list query params without empty filters', () => {
    expect(buildDealListParams({ page: 2, search: '  DEAL-1 ' })).toEqual({
      page: 2,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      search: 'DEAL-1',
    })
  })

  it('sorts timeline events chronologically', () => {
    const sorted = sortTimelineEvents([
      { id: '2', eventType: 'PAYMENT_SUCCESS', createdAt: '2026-07-02T10:00:00.000Z' },
      { id: '1', eventType: 'DEAL_CREATED', createdAt: '2026-07-01T10:00:00.000Z' },
    ])
    expect(sorted.map((event) => event.id)).toEqual(['1', '2'])
  })

  it('labels payment success events by payer role', () => {
    expect(describeTimelineEvent({
      eventType: 'PAYMENT_SUCCESS',
      payload: { payerRole: 'BUYER', amount: '90', currency: 'INR' },
    }).label).toBe('Buyer paid')
  })
})

describe('counterpartyProfile with deal unlock status', () => {
  it('masks profile fields when contact is locked', () => {
    const masked = maskCounterpartyProfile(
      {
        portalUserId: 'USR-1',
        city: 'Mumbai',
        companyName: 'Hidden Co',
        email: 'hidden@test.com',
      },
      { contactUnlockStatus: 'LOCKED' },
    )

    expect(masked.portalUserId).toBe('USR-1')
    expect(masked.city).toBe('Mumbai')
    expect(masked.companyName).toBeUndefined()
    expect(masked.email).toBeUndefined()
    expect(masked.profileUnlocked).toBe(false)
  })

  it('shows full profile when contact is unlocked', () => {
    expect(isCounterpartyProfileUnlocked({ contactUnlockStatus: 'UNLOCKED' })).toBe(true)
    expect(isDealContactUnlocked({ contactUnlockStatus: 'UNLOCKED' })).toBe(true)
  })
})
