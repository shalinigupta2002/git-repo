import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  getAdminDeal,
  getBuyerDeal,
  getSellerDeal,
  payBuyerDeal,
  paySellerDeal,
} from '../services/deal.service.js'

const GET_FETCHERS = Object.freeze({
  BUYER: getBuyerDeal,
  SELLER: getSellerDeal,
  ADMIN: getAdminDeal,
})

const PAY_FETCHERS = Object.freeze({
  BUYER: payBuyerDeal,
  SELLER: paySellerDeal,
})

export function useDeal(dealId, role = 'BUYER') {
  const getDeal = GET_FETCHERS[role] ?? getBuyerDeal
  const payDeal = PAY_FETCHERS[role] ?? null

  const [deal, setDeal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const [paymentSuccess, setPaymentSuccess] = useState(false)

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
    if (!payDeal || !dealId) {
      throw new Error('Payment is not available for this view.')
    }

    setPaying(true)
    setError('')
    try {
      const data = await payDeal(dealId)
      setDeal(data?.deal ?? null)
      setPaymentSuccess(true)
      toast.success('Deal charge paid successfully')
      return data?.deal ?? null
    } catch (err) {
      const message = err.message || 'Payment failed'
      setError(message)
      toast.error(message)
      throw err
    } finally {
      setPaying(false)
    }
  }, [dealId, payDeal])

  return {
    deal,
    loading,
    paying,
    error,
    paymentSuccess,
    load,
    pay,
    setDeal,
  }
}
