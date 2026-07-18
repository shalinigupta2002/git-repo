import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  listAdminDeals,
  listBuyerDeals,
  listSellerDeals,
} from '../services/deal.service.js'
import { buildDealListParams } from '../utils/dealHelpers.js'

const LIST_FETCHERS = Object.freeze({
  BUYER: listBuyerDeals,
  SELLER: listSellerDeals,
  ADMIN: listAdminDeals,
})

const DEFAULT_FILTERS = Object.freeze({
  page: 1,
  limit: 20,
  search: '',
  status: '',
  fromDate: '',
  toDate: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
  buyerId: '',
  sellerId: '',
})

export function useDeals(role = 'BUYER', initialFilters = {}) {
  const fetchDeals = LIST_FETCHERS[role] ?? listBuyerDeals
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS, ...initialFilters })
  const [deals, setDeals] = useState([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const queryParams = useMemo(() => buildDealListParams(filters), [filters])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchDeals(queryParams)
      setDeals(Array.isArray(data?.deals) ? data.deals : [])
      setPagination(data?.pagination ?? {
        page: filters.page,
        limit: filters.limit,
        total: 0,
        totalPages: 0,
      })
    } catch (err) {
      setDeals([])
      setError(err.message || 'Failed to load deals')
    } finally {
      setLoading(false)
    }
  }, [fetchDeals, queryParams, filters.limit, filters.page])

  useEffect(() => {
    load()
  }, [load])

  const updateFilters = useCallback((patch) => {
    setFilters((prev) => {
      const next = { ...prev, ...patch }
      const resetKeys = ['search', 'status', 'fromDate', 'toDate', 'buyerId', 'sellerId', 'sortBy', 'sortOrder']
      if (resetKeys.some((key) => patch[key] != null) && patch.page == null) {
        next.page = 1
      }
      return next
    })
  }, [])

  const resetFilters = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS, ...initialFilters })
  }, [initialFilters])

  return {
    deals,
    pagination,
    filters,
    loading,
    error,
    load,
    updateFilters,
    resetFilters,
    setFilters,
  }
}
