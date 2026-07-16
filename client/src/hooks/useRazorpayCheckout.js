import { useCallback, useState } from 'react'
import { useAppDispatch } from './redux.js'
import { activateSubscription, loadSubscriptionStatus } from '../store/slices/subscriptionSlice.js'
import { createSubscriptionOrder, verifySubscriptionPayment } from '../services/subscription.service.js'
import { env } from '../constants/env.js'

/** Dynamically loads the Razorpay checkout script once and returns true when ready. */
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true)
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload  = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

/**
 * Initiates the full Razorpay payment flow for a subscription plan.
 *
 * @param {object} options
 * @param {string} options.plan  - One of BUYER_STANDARD | BUYER_LIFETIME | SELLER_MONTH | SELLER_LIFETIME
 * @param {object} options.user  - { email, companyName } for pre-filling checkout
 * @param {function} options.onSuccess - Called with `plan` after successful payment + verification
 * @param {function} [options.onError]  - Called with error message on failure
 */
export function useRazorpayCheckout() {
  const dispatch = useAppDispatch()
  /** Razorpay plan id for the tier currently opening checkout, or null. */
  const [loadingPlan, setLoadingPlan] = useState(null)

  const startCheckout = useCallback(
    async ({ plan, user, onSuccess, onError }) => {
      setLoadingPlan(plan)
      try {
        const scriptLoaded = await loadRazorpayScript()
        if (!scriptLoaded) {
          throw new Error('Failed to load payment gateway. Check your internet connection.')
        }

        const orderData = await createSubscriptionOrder(plan)
        const checkoutKey = orderData.keyId || env.razorpayKeyId
        if (!checkoutKey) {
          throw new Error(
            'Payment gateway is not configured. Set VITE_RAZORPAY_KEY_ID in client/.env or RAZORPAY_KEY_ID on the server.',
          )
        }

        await new Promise((resolve, reject) => {
          const rzp = new window.Razorpay({
            key:         checkoutKey,
            amount:      orderData.amount,
            currency:    orderData.currency,
            order_id:    orderData.razorpayOrderId,
            name:        'B2B Marketplace',
            description: plan.startsWith('BOTH_')
              ? 'Full access — buyer & seller'
              : `${plan.replace(/_/g, ' ')} subscription`,
            prefill: {
              email: user?.email || '',
              name:  user?.companyName || '',
            },
            theme: { color: '#4F46E5' },

            handler: async (response) => {
              try {
                await verifySubscriptionPayment({
                  razorpayOrderId:   response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                })
                dispatch(activateSubscription(plan))
                await dispatch(loadSubscriptionStatus())
                resolve()
              } catch (err) {
                reject(err)
              }
            },

            modal: {
              ondismiss: () => reject(new Error('Payment cancelled')),
            },
          })
          rzp.on('payment.failed', (response) => {
            reject(new Error(response.error?.description || 'Payment failed'))
          })
          rzp.open()
        })

        onSuccess?.(plan)
      } catch (err) {
        const msg = err?.message || 'Payment failed'
        onError?.(msg)
      } finally {
        setLoadingPlan(null)
      }
    },
    [dispatch],
  )

  return {
    startCheckout,
    /** @deprecated Prefer loadingPlan + isPlanLoading for multi-button pages */
    loading: loadingPlan != null,
    loadingPlan,
    isPlanLoading: (plan) => loadingPlan === plan,
  }
}
