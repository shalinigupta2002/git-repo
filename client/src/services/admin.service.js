import { api } from './api.js'
import { throwFriendly } from '../utils/apiError.js'

async function getJson(path) {
  try {
    const { data } = await api.get(path)
    if (!data?.success) throw new Error(data?.error?.message || 'Request failed')
    return data.data
  } catch (e) {
    throwFriendly(e, 'Request failed')
  }
}

async function postJson(path, body) {
  try {
    const { data } = await api.post(path, body)
    if (!data?.success) throw new Error(data?.error?.message || 'Request failed')
    return data.data
  } catch (e) {
    throwFriendly(e, 'Request failed')
  }
}

async function patchJson(path, body) {
  try {
    const { data } = await api.patch(path, body)
    if (!data?.success) throw new Error(data?.error?.message || 'Request failed')
    return data.data
  } catch (e) {
    throwFriendly(e, 'Request failed')
  }
}

async function deleteJson(path) {
  try {
    const { data } = await api.delete(path)
    if (!data?.success) throw new Error(data?.error?.message || 'Request failed')
    return data.data
  } catch (e) {
    throwFriendly(e, 'Request failed')
  }
}

export function fetchAdminBuyers() {
  return getJson('/admin/buyers')
}

export function fetchAdminSellers() {
  return getJson('/admin/sellers')
}

export function fetchAdminTransactions() {
  return getJson('/admin/transactions')
}

export function fetchAdminStats() {
  return getJson('/admin/stats')
}

// ─── Category management ─────────────────────────────────────────────────────

export function fetchAdminCategories() {
  return getJson('/admin/categories')
}

export function createAdminCategory(body) {
  return postJson('/admin/categories', body)
}

export function updateAdminCategory(id, body) {
  return patchJson(`/admin/categories/${id}`, body)
}

export function deleteAdminCategory(id) {
  return deleteJson(`/admin/categories/${id}`)
}

// ─── Category requests ────────────────────────────────────────────────────────

export function fetchAdminCategoryRequests(status) {
  const qs = status ? `?status=${status}` : ''
  return getJson(`/admin/category-requests${qs}`)
}

export function decideCategoryRequest(id, body) {
  return patchJson(`/admin/category-requests/${id}/decide`, body)
}
