import { api } from './api.js'
import { throwFriendly } from '../utils/apiError.js'

/** Fetch active shop category tree from admin-managed catalog.categories */
export async function fetchShopCategories({ signal } = {}) {
  try {
    const { data } = await api.get('/shop-categories', {
      signal,
      headers: { 'Cache-Control': 'no-cache' },
    })
    if (!data?.success) throw new Error(data?.error?.message || 'Failed to load categories')
    return Array.isArray(data.data?.tree) ? data.data.tree : []
  } catch (e) {
    throwFriendly(e, 'Failed to load categories')
  }
}
