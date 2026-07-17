import { api } from './api.js'
import { throwFriendly } from '../utils/apiError.js'

export async function createQuoteRequest(payload) {
  try {
    const { data } = await api.post('/quote-requests', payload)
    if (!data?.success) throw new Error(data?.error?.message || 'Failed to send quote request')
    return data.data
  } catch (e) {
    throwFriendly(e, 'Failed to send quote request')
  }
}

export async function uploadRfqAttachments(files, onProgress) {
  const form = new FormData()
  files.forEach((file) => form.append('files', file))
  try {
    const { data } = await api.post('/quote-requests/attachments', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (!onProgress || !event.total) return
        onProgress(Math.round((event.loaded / event.total) * 100))
      },
    })
    if (!data?.success) throw new Error(data?.error?.message || 'Failed to upload attachments')
    return data.data?.attachments || []
  } catch (e) {
    throwFriendly(e, 'Failed to upload attachments')
  }
}

export async function listQuoteRequests(params = {}) {
  try {
    const { data } = await api.get('/quote-requests', { params })
    if (!data?.success) throw new Error(data?.error?.message || 'Failed to load RFQs')
    return data.data
  } catch (e) {
    throwFriendly(e, 'Failed to load RFQs')
  }
}

export async function listGroupedRfqs(params = {}) {
  try {
    const { data } = await api.get('/quote-requests/groups', { params })
    if (!data?.success) throw new Error(data?.error?.message || 'Failed to load RFQ groups')
    return data.data
  } catch (e) {
    throwFriendly(e, 'Failed to load RFQ groups')
  }
}

export async function getRfqGroupComparison(rfqGroupId) {
  try {
    const { data } = await api.get(`/quote-requests/groups/${rfqGroupId}`)
    if (!data?.success) throw new Error(data?.error?.message || 'Failed to load RFQ comparison')
    return data.data
  } catch (e) {
    throwFriendly(e, 'Failed to load RFQ comparison')
  }
}

export async function fetchRfqStats(params = {}) {
  try {
    const { data } = await api.get('/quote-requests/stats', { params })
    if (!data?.success) throw new Error(data?.error?.message || 'Failed to load RFQ stats')
    return data.data
  } catch (e) {
    throwFriendly(e, 'Failed to load RFQ stats')
  }
}

export async function getQuoteRequest(requestId, params = {}) {
  try {
    const { data } = await api.get(`/quote-requests/${requestId}`, { params })
    if (!data?.success) throw new Error(data?.error?.message || 'Failed to load RFQ')
    return data.data
  } catch (e) {
    throwFriendly(e, 'Failed to load RFQ')
  }
}

export async function respondToQuote(requestId, payload) {
  try {
    const { data } = await api.patch(`/quote-requests/${requestId}/respond`, payload)
    if (!data?.success) throw new Error(data?.error?.message || 'Failed to send quote')
    return data.data
  } catch (e) {
    throwFriendly(e, 'Failed to send quote')
  }
}

export async function acceptQuote(requestId) {
  try {
    const { data } = await api.patch(`/quote-requests/${requestId}/accept`)
    if (!data?.success) throw new Error(data?.error?.message || 'Failed to accept quote')
    return data.data
  } catch (e) {
    throwFriendly(e, 'Failed to accept quote')
  }
}

export async function rejectQuoteBySeller(requestId) {
  try {
    const { data } = await api.patch(`/quote-requests/${requestId}/seller-reject`)
    if (!data?.success) throw new Error(data?.error?.message || 'Failed to decline RFQ')
    return data.data
  } catch (e) {
    throwFriendly(e, 'Failed to decline RFQ')
  }
}

export async function rejectQuote(requestId) {
  try {
    const { data } = await api.patch(`/quote-requests/${requestId}/reject`)
    if (!data?.success) throw new Error(data?.error?.message || 'Failed to decline quote')
    return data.data
  } catch (e) {
    throwFriendly(e, 'Failed to decline quote')
  }
}

export async function cancelQuoteRequest(requestId) {
  try {
    const { data } = await api.patch(`/quote-requests/${requestId}/cancel`)
    if (!data?.success) throw new Error(data?.error?.message || 'Failed to cancel RFQ')
    return data.data
  } catch (e) {
    throwFriendly(e, 'Failed to cancel RFQ')
  }
}

export async function fetchRfqNotifications(params = {}) {
  try {
    const { data } = await api.get('/quote-requests/notifications', { params })
    if (!data?.success) throw new Error(data?.error?.message || 'Failed to load notifications')
    return data.data
  } catch (e) {
    throwFriendly(e, 'Failed to load notifications')
  }
}

export async function markRfqNotificationsRead(payload = {}) {
  try {
    const { data } = await api.patch('/quote-requests/notifications/read', payload)
    if (!data?.success) throw new Error(data?.error?.message || 'Failed to update notifications')
    return data.data
  } catch (e) {
    throwFriendly(e, 'Failed to update notifications')
  }
}

/** Seller: buyers who completed at least one accepted quotation. */
export async function fetchConfirmedBuyers() {
  try {
    const { data } = await api.get('/quote-requests/confirmed-buyers')
    if (!data?.success) throw new Error(data?.error?.message || 'Failed to load confirmed buyers')
    return data.data
  } catch (e) {
    throwFriendly(e, 'Failed to load confirmed buyers')
  }
}
