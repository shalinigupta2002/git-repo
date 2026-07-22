import { useCallback, useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import {
  getAdminDeal,
  getBuyerDeal,
  getSellerDeal,
} from '../services/deal.service.js'
import { useDealRazorpayCheckout } from './useDealRazorpayCheckout.js'
import { isPaymentCancelledError } from '../utils/paymentErrors.js'

const GET_FETCHERS = Object.freeze({
  BUYER: getBuyerDeal,
  SELLER: getSellerDeal,
  ADMIN: getAdminDeal,
})

export function useDeal(dealId, role = 'BUYER') {
  const getDeal = GET_FETCHERS[role] ?? getBuyerDeal
  const user = useSelector((state) => state.auth.user)
  const { payDeal, paying } = useDealRazorpayCheckout(role)

  const [deal, setDeal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [paymentCancelled, setPaymentCancelled] = useState(false)

  const load = useCallback(async () => {
    if (!dealId) return
    setLoading(true)
    setError('')
    try {
      const data = await getDeal(dealId)
      setDeal(data?.deal ?? null)
    } catch (err) {
      setDeal(null)
      setError(err.message || 'Failed to load deal')
    } finally {
      setLoading(false)
    }
  }, [dealId, getDeal])

  useEffect(() => {
    load()
  }, [load])

  const pay = useCallback(async () => {
    if (!dealId) {
      throw new Error('Payment is not available for this view.')
    }

    setError('')
    setPaymentCancelled(false)
    try {
      const updated = await payDeal(dealId, {
        user,
        onSuccess: (nextDeal) => {
          if (nextDeal) setDeal(nextDeal)
          setPaymentSuccess(true)
          toast.success('Deal charge paid successfully')
        },
        onCancelled: () => {
          setPaymentCancelled(true)
        },
      })
      if (updated) {
        setDeal(updated)
        setPaymentSuccess(true)
      }
      return updated
    } catch (err) {
      if (isPaymentCancelledError(err)) {
        setPaymentCancelled(true)
        return null
      }
      const message = err.message || 'Payment failed'
      setError(message)
      toast.error(message)
      throw err
    }
  }, [dealId, payDeal, user])

  return {
    deal,
    loading,
    paying,
    error,
    paymentSuccess,
    paymentCancelled,
    load,
    pay,
    setDeal,
  }
}
