import { api } from './api.js'
import { throwFriendly } from '../utils/apiError.js'

export async function listOrders(params = {}) {
  try {
    const { data } = await api.get('/orders', { params })
    if (!data?.success) throw new Error(data?.error?.message || 'Failed to load orders')
    return data.data
  } catch (e) {
    throwFriendly(e, 'Failed to load orders')
  }
}

export async function getOrder(orderId) {
  try {
    const { data } = await api.get(`/orders/${orderId}`)
    if (!data?.success) throw new Error(data?.error?.message || 'Failed to load order')
    return data.data
  } catch (e) {
    throwFriendly(e, 'Failed to load order')
  }
}

export async function updateOrderStatus(orderId, status) {
  try {
    const { data } = await api.patch(`/orders/${orderId}/status`, { status })
    if (!data?.success) throw new Error(data?.error?.message || 'Failed to update order')
    return data.data
  } catch (e) {
    throwFriendly(e, 'Failed to update order')
  }
}
