import { api } from './api.js'
import { throwFriendly } from '../utils/apiError.js'

/**
 * Create a Razorpay order on the backend.
 * @param {'BUYER_STANDARD'|'BUYER_LIFETIME'|'SELLER_MONTH'|'SELLER_LIFETIME'} plan
 * @returns {{ razorpayOrderId, amount, currency, keyId }}
 */
export async function createSubscriptionOrder(plan) {
  try {
    const { data } = await api.post('/subscriptions/create-order', { plan })
    if (!data.success) throw new Error(data.error?.message || 'Failed to create order')
    return data.data
  } catch (e) {
    throwFriendly(e, 'Could not initiate payment')
  }
}

/**
 * Verify payment signature and activate subscription.
 * @param {{ razorpayOrderId, razorpayPaymentId, razorpaySignature }} payload
 * @returns {{ subscription }}
 */
export async function verifySubscriptionPayment(payload) {
  try {
    const { data } = await api.post('/subscriptions/verify', payload)
    if (!data.success) throw new Error(data.error?.message || 'Payment verification failed')
    return data.data
  } catch (e) {
    throwFriendly(e, 'Payment verification failed')
  }
}

/**
 * Fetch current subscription status for the logged-in user.
 * @returns {{ hasSellerSubscription, hasBuyerSubscription, subscriptions }}
 */
export async function fetchSubscriptionStatus() {
  try {
    const { data } = await api.get('/subscriptions/status')
    if (!data.success) throw new Error(data.error?.message || 'Failed to fetch status')
    return data.data
  } catch (e) {
    throwFriendly(e, 'Could not load subscription status')
  }
}
