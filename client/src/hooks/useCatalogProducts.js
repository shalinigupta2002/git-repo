import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchCatalogProducts } from '../services/catalog.service.js'
import { ApiErrorType, isCanceledError } from '../utils/apiError.js'

/**
 * Infinite-scroll data hook for the catalog products API.
 *
 * Behaviour:
 * - Whenever `q`, `category` or `brand` changes, the list is reset
 *   and the first page is re-fetched.
 * - `loadMore()` fetches the next page using the last-known cursor.
 * - Previous in-flight first-page requests are aborted so stale
 *   responses never land after newer filter changes.
 * - On failure, `error` is `{ message, type, status, endpoint }` so the
 *   UI can render a classified ErrorState and offer a retry.
 */
export function useCatalogProducts({ q = '', category = '', brand = '', limit = 12 } = {}) {
  const [items, setItems] = useState([])
  const [nextCursor, setNextCursor] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [initialized, setInitialized] = useState(false)
  const [reloadTick, setReloadTick] = useState(0)

  const abortRef = useRef(null)
  const loadMoreInFlight = useRef(false)

  const normalizedQ = q?.trim() ?? ''

  useEffect(() => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)
    setItems([])
    setNextCursor(null)

    fetchCatalogProducts({
      q: normalizedQ,
      category,
      brand,
      limit,
      signal: controller.signal,
    })
      .then((res) => {
        setItems(res.items)
        setNextCursor(res.nextCursor)
        setInitialized(true)
      })
      .catch((e) => {
        if (isCanceledError(e)) return
        setError({
          message: e.message || 'Failed to load products',
          type: e.type || ApiErrorType.UNKNOWN,
          status: e.status ?? null,
          endpoint: e.endpoint || null,
        })
        setInitialized(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [normalizedQ, category, brand, limit, reloadTick])

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadMoreInFlight.current) return
    loadMoreInFlight.current = true
    setLoadingMore(true)
    setError(null)
    try {
      const res = await fetchCatalogProducts({
        q: normalizedQ,
        category,
        brand,
        limit,
        cursor: nextCursor,
      })
      setItems((prev) => [...prev, ...res.items])
      setNextCursor(res.nextCursor)
    } catch (e) {
      if (!isCanceledError(e)) {
        setError({
          message: e.message || 'Failed to load products',
          type: e.type || ApiErrorType.UNKNOWN,
          status: e.status ?? null,
          endpoint: e.endpoint || null,
        })
      }
    } finally {
      loadMoreInFlight.current = false
      setLoadingMore(false)
    }
  }, [nextCursor, normalizedQ, category, brand, limit])

  const retry = useCallback(() => setReloadTick((t) => t + 1), [])

  return {
    items,
    nextCursor,
    loading,
    loadingMore,
    error,
    initialized,
    hasMore: Boolean(nextCursor),
    loadMore,
    retry,
  }
}
