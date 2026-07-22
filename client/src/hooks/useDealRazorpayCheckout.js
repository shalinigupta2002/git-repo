import { useCallback, useState } from 'react'
import { env } from '../constants/env.js'
import {
  createDealPaymentOrder,
  payBuyerDeal,
  paySellerDeal,
  verifyDealPayment,
} from '../services/deal.service.js'
import { createPaymentCancelledError, isPaymentCancelledError } from '../utils/paymentErrors.js'

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true)
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export function useDealRazorpayCheckout(role = 'BUYER') {
  const [paying, setPaying] = useState(false)

  const payDeal = useCallback(async (dealId, { user, onSuccess, onCancelled } = {}) => {
    setPaying(true)
    try {
      const orderData = await createDealPaymentOrder(dealId, role)

      if (orderData?.alreadyPaid) {
        onSuccess?.(orderData.deal)
        return orderData.deal
      }

      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded) {
        throw new Error('Failed to load payment gateway. Check your internet connection.')
      }

      const checkoutKey = orderData.keyId || env.razorpayKeyId
      if (!checkoutKey) {
        throw new Error('Payment gateway is not configured.')
      }

      const deal = await new Promise((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: checkoutKey,
          amount: orderData.amount,
          currency: orderData.currency,
          order_id: orderData.razorpayOrderId,
          name: 'B2B Marketplace',
          description: 'Platform Deal Charge (Test Mode)',
          prefill: {
            email: user?.email || '',
            name: user?.companyName || '',
          },
          theme: { color: '#059669' },
          handler: async (response) => {
            try {
              const verified = await verifyDealPayment(dealId, {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }, role)
              resolve(verified?.deal ?? null)
            } catch (err) {
              reject(err)
            }
          },
          modal: {
            ondismiss: () => reject(createPaymentCancelledError()),
          },
        })

        rzp.on('payment.failed', (response) => {
          reject(new Error(response.error?.description || 'Payment failed'))
        })
        rzp.open()
      })

      onSuccess?.(deal)
      return deal
    } catch (error) {
      if (isPaymentCancelledError(error)) {
        onCancelled?.()
        return null
      }
      const status = error?.response?.status
      const code = error?.response?.data?.error?.code || error?.code
      if (status === 503 || code === 'RAZORPAY_NOT_CONFIGURED') {
        const payFn = role === 'SELLER' ? paySellerDeal : payBuyerDeal
        const fallback = await payFn(dealId)
        onSuccess?.(fallback?.deal ?? null)
        return fallback?.deal ?? null
      }
      throw error
    } finally {
      setPaying(false)
    }
  }, [role])

  return { payDeal, paying }
}
