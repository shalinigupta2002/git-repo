import { api } from './api.js'
import { isCanceledError, throwFriendly } from '../utils/apiError.js'

/** Fetch all catalog categories (public endpoint) */
export async function fetchCatalogCategories() {
  try {
    const { data } = await api.get('/catalog/categories')
    if (!data?.success) throw new Error(data?.error?.message || 'Failed to load categories')
    return Array.isArray(data.data?.categories) ? data.data.categories : (data.data || [])
  } catch (e) {
    throwFriendly(e, 'Failed to load categories')
  }
}

/**
 * Fetch a page of products from the backend catalog endpoint.
 *
 * @param {object}  opts
 * @param {string=} opts.q         Case-insensitive search on title/description
 * @param {string=} opts.category  Category slug (e.g. "mobiles", "laptops")
 * @param {string=} opts.brand     Brand slug or name (case-insensitive)
 * @param {string=} opts.cursor    Opaque cursor returned by previous call
 * @param {number=} opts.limit     Page size (default 12)
 * @param {AbortSignal=} opts.signal  Abort signal for cancellation
 *
 * @returns {Promise<{ items: Array, nextCursor: string|null }>}
 */
export async function fetchCatalogProducts({
  q,
  category,
  brand,
  cursor,
  limit = 12,
  signal,
} = {}) {
  try {
    const params = {}
    if (q && q.trim()) params.q = q.trim()
    if (category) params.category = category
    if (brand) params.brand = brand
    if (cursor) params.cursor = cursor
    if (limit) params.limit = limit

    const { data } = await api.get('/catalog/products', { params, signal })

    if (!data?.success) {
      throw new Error(data?.error?.message || 'Failed to load products')
    }
    return {
      items: Array.isArray(data.data?.products) ? data.data.products : [],
      nextCursor: data.data?.nextCursor ?? null,
    }
  } catch (e) {
    if (isCanceledError(e)) throw e
    throwFriendly(e, 'Failed to load products')
  }
}

/** Fetch alternative seller listings for multi-seller RFQ. */
export async function fetchAlternativeSellerListings(productId, { limit = 12, signal } = {}) {
  try {
    const { data } = await api.get(
      `/catalog/products/${encodeURIComponent(productId)}/alternative-sellers`,
      { params: { limit }, signal },
    )
    if (!data?.success) throw new Error(data?.error?.message || 'Failed to load alternative sellers')
    return Array.isArray(data.data?.products) ? data.data.products : []
  } catch (e) {
    if (isCanceledError(e)) throw e
    throwFriendly(e, 'Failed to load alternative sellers')
  }
}

/** Fetch one catalog product by id for the detail page. */
export async function fetchCatalogProduct(id, { signal } = {}) {
  try {
    const { data } = await api.get(`/catalog/products/${encodeURIComponent(id)}`, { signal })
    if (!data?.success) throw new Error(data?.error?.message || 'Failed to load product')
    return data.data?.product ?? null
  } catch (e) {
    if (isCanceledError(e)) throw e
    throwFriendly(e, 'Failed to load product')
  }
}
