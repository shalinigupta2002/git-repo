'use strict'

const {
  assertTransition,
  canTransition,
  isTerminalStatus,
  isRevisionTransition,
  defaultQuoteValidUntil,
} = require('../services/rfqLifecycleService.js')

describe('rfqLifecycleService', () => {
  test('buyer can cancel pending RFQ only', () => {
    expect(canTransition('PENDING', 'CANCELLED', 'BUYER')).toBe(true)
    expect(canTransition('RESPONDED', 'CANCELLED', 'BUYER')).toBe(false)
  })

  test('seller can revise responded quotation', () => {
    expect(isRevisionTransition('RESPONDED', 'RESPONDED')).toBe(true)
    assertTransition('RESPONDED', 'RESPONDED', 'SELLER')
  })

  test('terminal statuses reject further transitions', () => {
    expect(isTerminalStatus('ACCEPTED')).toBe(true)
    expect(isTerminalStatus('NOT_SELECTED')).toBe(true)
    expect(() => assertTransition('ACCEPTED', 'RESPONDED', 'SELLER')).toThrow(/closed/)
    expect(() => assertTransition('NOT_SELECTED', 'RESPONDED', 'SELLER')).toThrow(/closed/)
  })

  test('default quote validity is ~30 days ahead', () => {
    const date = defaultQuoteValidUntil()
    const diffDays = (date.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    expect(diffDays).toBeGreaterThan(29)
    expect(diffDays).toBeLessThan(31)
  })
})
