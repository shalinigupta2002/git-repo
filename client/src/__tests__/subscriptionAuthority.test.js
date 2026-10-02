import { describe, expect, it, beforeEach, vi } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import {
  canAccessBuyerWorkspace,
  canAccessSellerWorkspace,
  visibleBuyerSubNav,
} from '../utils/portalNav.js'
import { resolveSellerEntryPath } from '../utils/sellerSubscription.js'
import {
  hasSubscriptionEntitlement,
  isSubscriptionStatusPending,
} from '../utils/subscriptionEntitlement.js'
import {
  loadSubscriptionStatus,
  subscriptionReducer,
} from '../store/slices/subscriptionSlice.js'

vi.mock('../services/subscription.service.js', () => ({
  fetchSubscriptionStatus: vi.fn(),
}))

import { fetchSubscriptionStatus } from '../services/subscription.service.js'

const BUYER_SUB_KEY = 'buyer_subscription_active'
const SELLER_SUB_KEY = 'seller_subscription_active'

describe('subscription authority (API/Redux, not localStorage)', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('Case 1: no localStorage flag + API ACTIVE → buyer workspace access', async () => {
    expect(localStorage.getItem(BUYER_SUB_KEY)).toBeNull()
    fetchSubscriptionStatus.mockResolvedValue({
      hasBuyerSubscription: true,
      hasSellerSubscription: false,
      subscriptions: [{ plan: 'BUYER_ANNUAL', status: 'ACTIVE' }],
    })

    const store = configureStore({ reducer: { subscription: subscriptionReducer } })
    await store.dispatch(loadSubscriptionStatus())
    const { hasBuyer, status } = store.getState().subscription

    expect(status).toBe('succeeded')
    expect(hasBuyer).toBe(true)
    expect(canAccessBuyerWorkspace('BUYER', hasBuyer)).toBe(true)
    expect(visibleBuyerSubNav(hasBuyer).every((i) => !i.locked || i.to === '/buyer/dashboard')).toBe(true)
  })

  it('Case 2: localStorage ACTIVE + API INACTIVE → not subscribed', async () => {
    localStorage.setItem(BUYER_SUB_KEY, '1')
    fetchSubscriptionStatus.mockResolvedValue({
      hasBuyerSubscription: false,
      hasSellerSubscription: false,
      subscriptions: [],
    })

    const store = configureStore({ reducer: { subscription: subscriptionReducer } })
    await store.dispatch(loadSubscriptionStatus())
    const { hasBuyer } = store.getState().subscription

    expect(hasBuyer).toBe(false)
    expect(canAccessBuyerWorkspace('BUYER', hasBuyer)).toBe(false)
    expect(
      hasSubscriptionEntitlement('buyer', {
        hasBuyer,
        hasSeller: false,
        status: 'succeeded',
      }),
    ).toBe(false)
  })

  it('Case 3: localStorage INACTIVE + API ACTIVE → use API', async () => {
    fetchSubscriptionStatus.mockResolvedValue({
      hasBuyerSubscription: true,
      hasSellerSubscription: false,
      subscriptions: [],
    })

    const store = configureStore({ reducer: { subscription: subscriptionReducer } })
    await store.dispatch(loadSubscriptionStatus())
    const { hasBuyer } = store.getState().subscription

    expect(hasBuyer).toBe(true)
    expect(canAccessBuyerWorkspace('BUYER', hasBuyer)).toBe(true)
  })

  it('Case 4: subscription API loading → pending (no false inactive)', () => {
    expect(isSubscriptionStatusPending('loading')).toBe(true)
    expect(isSubscriptionStatusPending('idle')).toBe(true)
    expect(
      hasSubscriptionEntitlement('buyer', {
        hasBuyer: false,
        hasSeller: false,
        status: 'loading',
      }),
    ).toBeNull()
  })

  it('Case 5: subscription API failed → no entitlement granted', async () => {
    fetchSubscriptionStatus.mockRejectedValue(new Error('Network error'))
    const store = configureStore({ reducer: { subscription: subscriptionReducer } })
    await store.dispatch(loadSubscriptionStatus())
    const state = store.getState().subscription

    expect(state.status).toBe('failed')
    expect(
      hasSubscriptionEntitlement('buyer', {
        hasBuyer: state.hasBuyer,
        hasSeller: state.hasSeller,
        status: state.status,
      }),
    ).toBe(false)
  })

  it('Case 6: seller entry path uses hasSeller from API, not localStorage', () => {
    localStorage.setItem(SELLER_SUB_KEY, '1')
    expect(resolveSellerEntryPath('/seller/deals', false)).toBe('/seller/dashboard')
    expect(resolveSellerEntryPath('/seller/deals', true)).toBe('/seller/deals')
  })

  it('Case 7: API refresh from active to inactive drops entitlement (backend would still enforce)', async () => {
    fetchSubscriptionStatus
      .mockResolvedValueOnce({
        hasBuyerSubscription: true,
        hasSellerSubscription: false,
        subscriptions: [{ plan: 'BUYER_ANNUAL', status: 'ACTIVE' }],
      })
      .mockResolvedValueOnce({
        hasBuyerSubscription: false,
        hasSellerSubscription: false,
        subscriptions: [{ plan: 'BUYER_ANNUAL', status: 'EXPIRED' }],
      })

    const store = configureStore({ reducer: { subscription: subscriptionReducer } })
    await store.dispatch(loadSubscriptionStatus())
    expect(store.getState().subscription.hasBuyer).toBe(true)

    await store.dispatch(loadSubscriptionStatus())
    const { hasBuyer } = store.getState().subscription
    expect(hasBuyer).toBe(false)
    expect(canAccessBuyerWorkspace('BUYER', hasBuyer)).toBe(false)
  })

  it('portalNav defaults do not read localStorage (no sub without explicit flags)', () => {
    localStorage.setItem(BUYER_SUB_KEY, '1')
    expect(canAccessBuyerWorkspace('BUYER')).toBe(false)
    expect(canAccessSellerWorkspace('SELLER')).toBe(false)
  })
})
