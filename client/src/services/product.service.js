import { api } from './api.js'
import { throwFriendly } from '../utils/apiError.js'

export async function listProducts(params = {}) {
  try {
    const { data } = await api.get('/products', { params })
    if (!data?.success) throw new Error(data?.error?.message || 'Failed to load product list')
    return data.data
  } catch (e) {
    throwFriendly(e, 'Failed to load product list')
  }
}

export async function getProduct(productId) {
  try {
    const { data } = await api.get(`/products/${productId}`)
    if (!data?.success) throw new Error(data?.error?.message || 'Failed to load product details')
    return data.data
  } catch (e) {
    throwFriendly(e, 'Failed to load product details')
  }
}

export async function createProduct(payload, imageFiles = []) {
  try {
    let body = payload
    let headers = undefined

    if (Array.isArray(imageFiles) && imageFiles.length > 0) {
      const form = new FormData()
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          form.append(key, String(value))
        }
      })
      imageFiles.forEach((file) => form.append('images', file))
      body = form
      headers = { 'Content-Type': 'multipart/form-data' }
    }

    const { data } = await api.post('/products', body, headers ? { headers } : undefined)
    if (!data?.success) throw new Error(data?.error?.message || 'Failed to create product')
    return data.data
  } catch (e) {
    throwFriendly(e, 'Failed to create product')
  }
}

export async function updateProduct(productId, payload) {
  try {
    const { data } = await api.patch(`/products/${productId}`, payload)
    if (!data?.success) throw new Error(data?.error?.message || 'Failed to update product')
    return data.data
  } catch (e) {
    throwFriendly(e, 'Failed to update product')
  }
}

export async function deleteProduct(productId) {
  try {
    const response = await api.delete(`/products/${productId}`)
    if (response.status === 204) {
      return { deleted: true, archived: false }
    }
    const { data } = response
    if (!data?.success) throw new Error(data?.error?.message || 'Failed to delete product')
    return data.data
  } catch (e) {
    throwFriendly(e, 'Failed to delete product')
  }
}
