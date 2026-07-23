/**
 * subscriptionSlice Redux unit tests
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests the reducer, sync actions, and loadSubscriptionStatus thunk.
 * The subscription service is mocked so no HTTP requests are made.
 * The localStorage helpers (sellerSubscription / buyerSubscription) are also
 * mocked to prevent side-effects on the real localStorage in test runs.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'

vi.mock('../services/subscription.service.js', () => ({
  fetchSubscriptionStatus: vi.fn(),
}))

vi.mock('../utils/sellerSubscription.js', () => ({
  setSellerSubscriptionActive: vi.fn(),
  clearSellerSubscription:     vi.fn(),
}))

vi.mock('../utils/buyerSubscription.js', () => ({
  setBuyerSubscriptionActive: vi.fn(),
  clearBuyerSubscription:     vi.fn(),
}))

import {
  subscriptionReducer,
  activateSubscription,
  resetSubscription,
  loadSubscriptionStatus,
} from '../store/slices/subscriptionSlice.js'
import { fetchSubscriptionStatus } from '../services/subscription.service.js'

// ── Store factory ─────────────────────────────────────────────────────────────

function makeStore() {
  return configureStore({ reducer: { subscription: subscriptionReducer } })
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────
// Initial state
// ─────────────────────────────────────────────────────────────────────────────

describe('subscriptionSlice – initial state', () => {
  it('starts with no subscriptions', () => {
    const store = makeStore()
    const state = store.getState().subscription

    expect(state.hasSeller).toBe(false)
    expect(state.hasBuyer).toBe(false)
    expect(state.sellerPlanType).toBeNull()
    expect(state.buyerPlanType).toBeNull()
    expect(state.subscriptions).toEqual([])
    expect(state.status).toBe('idle')
    expect(state.error).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// activateSubscription (sync)
// ─────────────────────────────────────────────────────────────────────────────

describe('activateSubscription', () => {
  it('activating BUYER_ANNUAL sets hasBuyer and buyerPlanType', () => {
    const store = makeStore()
    store.dispatch(activateSubscription('BUYER_ANNUAL'))
    const state = store.getState().subscription

    expect(state.hasBuyer).toBe(true)
    expect(state.buyerPlanType).toBe('BUYER_ANNUAL')
    expect(state.hasSeller).toBe(false)
  })

  it('activating BUYER_LIFETIME sets hasBuyer and buyerPlanType', () => {
    const store = makeStore()
    store.dispatch(activateSubscription('BUYER_LIFETIME'))
    const state = store.getState().subscription

    expect(state.hasBuyer).toBe(true)
    expect(state.buyerPlanType).toBe('BUYER_LIFETIME')
  })

  it('activating SELLER_MONTHLY sets hasSeller and sellerPlanType', () => {
    const store = makeStore()
    store.dispatch(activateSubscription('SELLER_MONTHLY'))
    const state = store.getState().subscription

    expect(state.hasSeller).toBe(true)
    expect(state.sellerPlanType).toBe('SELLER_MONTHLY')
    expect(state.hasBuyer).toBe(false)
  })

  it('activating SELLER_LIFETIME sets hasSeller and sellerPlanType', () => {
    const store = makeStore()
    store.dispatch(activateSubscription('SELLER_LIFETIME'))
    const state = store.getState().subscription

    expect(state.hasSeller).toBe(true)
    expect(state.sellerPlanType).toBe('SELLER_LIFETIME')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// resetSubscription (sync)
// ─────────────────────────────────────────────────────────────────────────────

describe('resetSubscription', () => {
  it('clears all subscription state', () => {
    const store = makeStore()
    store.dispatch(activateSubscription('SELLER_LIFETIME'))
    store.dispatch(activateSubscription('BUYER_LIFETIME'))

    store.dispatch(resetSubscription())
    const state = store.getState().subscription

    expect(state.hasSeller).toBe(false)
    expect(state.hasBuyer).toBe(false)
    expect(state.sellerPlanType).toBeNull()
    expect(state.buyerPlanType).toBeNull()
    expect(state.subscriptions).toEqual([])
    expect(state.status).toBe('idle')
    expect(state.error).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// loadSubscriptionStatus thunk
// ─────────────────────────────────────────────────────────────────────────────

describe('loadSubscriptionStatus thunk', () => {
  it('fulfilled with buyer subscription updates hasBuyer', async () => {
    fetchSubscriptionStatus.mockResolvedValue({
      hasSellerSubscription: false,
      hasBuyerSubscription:  true,
      subscriptions: [
        { id: 'sub-001', plan: 'BUYER_ANNUAL', status: 'ACTIVE', startsAt: null, expiresAt: null },
      ],
    })

    const store = makeStore()
    await store.dispatch(loadSubscriptionStatus())
    const state = store.getState().subscription

    expect(state.status).toBe('succeeded')
    expect(state.hasBuyer).toBe(true)
    expect(state.hasSeller).toBe(false)
    expect(state.buyerPlanType).toBe('BUYER_ANNUAL')
    expect(state.sellerPlanType).toBeNull()
    expect(state.subscriptions).toHaveLength(1)
  })

  it('fulfilled with seller subscription updates hasSeller', async () => {
    fetchSubscriptionStatus.mockResolvedValue({
      hasSellerSubscription: true,
      hasBuyerSubscription:  false,
      subscriptions: [
        { id: 'sub-002', plan: 'SELLER_LIFETIME', status: 'ACTIVE', startsAt: null, expiresAt: null },
      ],
    })

    const store = makeStore()
    await store.dispatch(loadSubscriptionStatus())
    const state = store.getState().subscription

    expect(state.hasSeller).toBe(true)
    expect(state.sellerPlanType).toBe('SELLER_LIFETIME')
    expect(state.hasBuyer).toBe(false)
  })

  it('fulfilled with no subscriptions sets all flags false', async () => {
    fetchSubscriptionStatus.mockResolvedValue({
      hasSellerSubscription: false,
      hasBuyerSubscription:  false,
      subscriptions:         [],
    })

    const store = makeStore()
    await store.dispatch(loadSubscriptionStatus())
    const state = store.getState().subscription

    expect(state.hasSeller).toBe(false)
    expect(state.hasBuyer).toBe(false)
    expect(state.sellerPlanType).toBeNull()
    expect(state.buyerPlanType).toBeNull()
  })

  it('rejected – stores error, status is failed', async () => {
    fetchSubscriptionStatus.mockRejectedValue(new Error('Network error'))

    const store = makeStore()
    await store.dispatch(loadSubscriptionStatus())
    const state = store.getState().subscription

    expect(state.status).toBe('failed')
    expect(state.error).toBeTruthy()
  })

  it('pending – sets status to loading', () => {
    const store = makeStore()
    store.dispatch({ type: 'subscription/loadStatus/pending' })

    expect(store.getState().subscription.status).toBe('loading')
    expect(store.getState().subscription.error).toBeNull()
  })

  describe('auth state cleanup integration', () => {
    it('resets subscription state on auth/logout', () => {
      const store = makeStore()
      store.dispatch(activateSubscription('SELLER_LIFETIME'))
      store.dispatch(activateSubscription('BUYER_LIFETIME'))

      store.dispatch({ type: 'auth/logout' })
      const state = store.getState().subscription

      expect(state.hasSeller).toBe(false)
      expect(state.hasBuyer).toBe(false)
      expect(state.sellerPlanType).toBeNull()
      expect(state.buyerPlanType).toBeNull()
      expect(state.subscriptions).toEqual([])
      expect(state.status).toBe('idle')
      expect(state.error).toBeNull()
    })

    it('resets subscription state on auth/logoutUser/fulfilled', () => {
      const store = makeStore()
      store.dispatch(activateSubscription('SELLER_LIFETIME'))
      store.dispatch(activateSubscription('BUYER_LIFETIME'))

      store.dispatch({ type: 'auth/logoutUser/fulfilled' })
      const state = store.getState().subscription

      expect(state.hasSeller).toBe(false)
      expect(state.hasBuyer).toBe(false)
    })

    it('resets subscription state on auth/logoutUser/rejected', () => {
      const store = makeStore()
      store.dispatch(activateSubscription('SELLER_LIFETIME'))
      store.dispatch(activateSubscription('BUYER_LIFETIME'))

      store.dispatch({ type: 'auth/logoutUser/rejected' })
      const state = store.getState().subscription

      expect(state.hasSeller).toBe(false)
      expect(state.hasBuyer).toBe(false)
    })
  })
})

