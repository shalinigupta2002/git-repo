'use strict'

const {
  assertTransition,
  canTransition,
  isTerminalStatus,
  TRANSITIONS,
} = require('../services/dealLifecycleService.js')

describe('dealLifecycleService', () => {
  test('creation path QUOTATION_ACCEPTED → DEAL_CREATED → PAYMENT_PENDING', () => {
    expect(canTransition('QUOTATION_ACCEPTED', 'DEAL_CREATED')).toBe(true)
    expect(canTransition('DEAL_CREATED', 'PAYMENT_PENDING')).toBe(true)
    assertTransition('QUOTATION_ACCEPTED', 'DEAL_CREATED')
    assertTransition('DEAL_CREATED', 'PAYMENT_PENDING')
  })

  test('payment pending becomes active after both charges paid (later phase)', () => {
    expect(canTransition('PAYMENT_PENDING', 'ACTIVE')).toBe(true)
    assertTransition('PAYMENT_PENDING', 'ACTIVE')
  })

  test('rejects payment sub-states on deal status enum', () => {
    expect(TRANSITIONS.BUYER_PAID).toBeUndefined()
    expect(TRANSITIONS.SELLER_PAID).toBeUndefined()
    expect(TRANSITIONS.CONTACT_UNLOCKED).toBeUndefined()
  })

  test('terminal statuses reject further transitions', () => {
    expect(isTerminalStatus('COMPLETED')).toBe(true)
    expect(isTerminalStatus('CANCELLED')).toBe(true)
    expect(() => assertTransition('COMPLETED', 'ACTIVE')).toThrow(/closed/)
  })

  test('disputed deals can return to active or cancelled', () => {
    expect(canTransition('DISPUTED', 'ACTIVE')).toBe(true)
    expect(canTransition('DISPUTED', 'CANCELLED')).toBe(true)
    expect(canTransition('DISPUTED', 'COMPLETED')).toBe(false)
  })
})
