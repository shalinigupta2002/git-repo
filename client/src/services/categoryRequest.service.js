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

/** Fetch all category requests for the logged-in seller */
export function fetchMyCategoReqRequests() {
  return getJson('/category-requests')
}

/** Fetch unread-count for badge display */
export function fetchCategoryRequestUnreadCount() {
  return getJson('/category-requests/unread-count')
}

/** Submit a new category request */
export function submitCategoryRequest(body) {
  return postJson('/category-requests', body)
}

/** Mark a single request notification as read */
export function markCategoryRequestRead(id) {
  return patchJson(`/category-requests/${id}/read`, {})
}

/** Mark all notification as read */
export function markAllCategoryRequestsRead() {
  return patchJson('/category-requests/mark-all-read', {})
}

/** Approved category/subcategory requests merged into the product form tree */
export function fetchApprovedCategoryRequests() {
  return getJson('/category-requests/approved')
}
