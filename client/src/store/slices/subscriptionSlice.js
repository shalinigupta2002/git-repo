import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { fetchSubscriptionStatus } from '../../services/subscription.service.js'
import { setSellerSubscriptionActive, clearSellerSubscription } from '../../utils/sellerSubscription.js'
import { setBuyerSubscriptionActive, clearBuyerSubscription } from '../../utils/buyerSubscription.js'
import { logout, logoutUser } from './authSlice.js'

export const loadSubscriptionStatus = createAsyncThunk(
  'subscription/loadStatus',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchSubscriptionStatus()
    } catch (e) {
      return rejectWithValue(e.message || 'Failed to load subscription')
    }
  },
)

const initialState = {
  hasSeller: false,
  hasBuyer: false,
  sellerPlanType: null,
  buyerPlanType: null,
  buyerMarketplaceId: null,
  sellerMarketplaceId: null,
  portalUserId: null,
  buyerSubscription: null,
  sellerSubscription: null,
  subscriptions: [],
  status: 'idle',
  error: null,
}

const resetSubscriptionState = (state) => {
  state.hasSeller = false
  state.hasBuyer = false
  state.sellerPlanType = null
  state.buyerPlanType = null
  state.buyerMarketplaceId = null
  state.sellerMarketplaceId = null
  state.portalUserId = null
  state.buyerSubscription = null
  state.sellerSubscription = null
  state.subscriptions = []
  state.status = 'idle'
  state.error = null
  clearSellerSubscription()
  clearBuyerSubscription()
}

const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState,
  reducers: {
    /** Called immediately after a successful payment verify */
    activateSubscription(state, action) {
      const plan = action.payload

      const bundleGrants = {
        BOTH_MONTHLY:  { buyer: 'BUYER_MONTHLY',  seller: 'SELLER_MONTHLY' },
        BOTH_ANNUAL:   { buyer: 'BUYER_ANNUAL',   seller: 'SELLER_ANNUAL' },
        BOTH_LIFETIME: { buyer: 'BUYER_LIFETIME', seller: 'SELLER_LIFETIME' },
      }

      const bundle = bundleGrants[plan]
      if (bundle) {
        state.hasBuyer = true
        state.hasSeller = true
        state.buyerPlanType = bundle.buyer
        state.sellerPlanType = bundle.seller
        setBuyerSubscriptionActive()
        setSellerSubscriptionActive()
        return
      }

      if (plan === 'SELLER_MONTHLY' || plan === 'SELLER_ANNUAL' || plan === 'SELLER_LIFETIME') {
        state.hasSeller = true
        state.sellerPlanType = plan
        setSellerSubscriptionActive()
      }
      if (plan === 'BUYER_MONTHLY' || plan === 'BUYER_ANNUAL' || plan === 'BUYER_LIFETIME') {
        state.hasBuyer = true
        state.buyerPlanType = plan
        setBuyerSubscriptionActive()
      }
    },
    resetSubscription(state) {
      resetSubscriptionState(state)
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadSubscriptionStatus.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(loadSubscriptionStatus.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.hasSeller = action.payload.hasSellerSubscription
        state.hasBuyer  = action.payload.hasBuyerSubscription
        state.buyerMarketplaceId = action.payload.buyerMarketplaceId ?? null
        state.sellerMarketplaceId = action.payload.sellerMarketplaceId ?? null
        state.portalUserId = action.payload.portalUserId
          ?? action.payload.user?.portalUserId
          ?? action.payload.buyerMarketplaceId
          ?? null
        state.buyerSubscription = action.payload.buyerSubscription ?? null
        state.sellerSubscription = action.payload.sellerSubscription ?? null
        state.subscriptions = action.payload.subscriptions || []

        // Derive specific plan types from the subscriptions array
        const subs = action.payload.subscriptions || []
        const sellerSub = subs.find(
          (s) => s.plan === 'SELLER_MONTHLY' || s.plan === 'SELLER_ANNUAL' || s.plan === 'SELLER_LIFETIME',
        )
        state.sellerPlanType = sellerSub?.plan ?? null

        const buyerSub = subs.find(
          (s) => s.plan === 'BUYER_MONTHLY' || s.plan === 'BUYER_ANNUAL' || s.plan === 'BUYER_LIFETIME',
        )
        state.buyerPlanType = buyerSub?.plan ?? null

        // Keep localStorage in sync with authoritative server state
        if (action.payload.hasSellerSubscription) {
          setSellerSubscriptionActive()
        } else {
          clearSellerSubscription()
        }
        if (action.payload.hasBuyerSubscription) {
          setBuyerSubscriptionActive()
        } else {
          clearBuyerSubscription()
        }
      })
      .addCase(loadSubscriptionStatus.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || 'Failed to load subscription'
      })
      .addCase(logout, resetSubscriptionState)
      .addCase(logoutUser.fulfilled, resetSubscriptionState)
      .addCase(logoutUser.rejected, resetSubscriptionState)
  },
})

export const { activateSubscription, resetSubscription } = subscriptionSlice.actions
export const subscriptionReducer = subscriptionSlice.reducer

export function selectSubscription(state) {
  return state.subscription
}
export function selectHasSellerSubscription(state) {
  return state.subscription.hasSeller
}
export function selectHasBuyerSubscription(state) {
  return state.subscription.hasBuyer
}
export function selectSellerPlanType(state) {
  return state.subscription.sellerPlanType
}
export function selectBuyerPlanType(state) {
  return state.subscription.buyerPlanType
}
export function selectPortalUserId(state) {
  return (
    state.subscription.portalUserId
    ?? state.auth.user?.portalUserId
    ?? state.subscription.buyerMarketplaceId
    ?? state.auth.user?.buyerMarketplaceId
    ?? null
  )
}
export function selectBuyerMarketplaceId(state) {
  return selectPortalUserId(state)
}
export function selectSellerMarketplaceId(state) {
  return selectPortalUserId(state)
}
