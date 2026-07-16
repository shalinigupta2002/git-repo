import { api } from './api.js'
import { throwFriendly } from '../utils/apiError.js'

async function getJson(path) {
  try {
    const { data } = await api.get(path)
    if (!data?.success) throw new Error(data?.error?.message || 'Request failed')
    return data.data
  } catch (e) { throwFriendly(e, 'Request failed') }
}

async function postJson(path, body) {
  try {
    const { data } = await api.post(path, body)
    if (!data?.success) throw new Error(data?.error?.message || 'Request failed')
    return data.data
  } catch (e) { throwFriendly(e, 'Request failed') }
}

async function patchJson(path, body) {
  try {
    const { data } = await api.patch(path, body)
    if (!data?.success) throw new Error(data?.error?.message || 'Request failed')
    return data.data
  } catch (e) { throwFriendly(e, 'Request failed') }
}

export const sendContactMessage = async ({ subject, message, images = [], videos = [] }) => {
  const hasFiles = images.length > 0 || videos.length > 0

  if (!hasFiles) {
    return postJson('/contact', { subject, message })
  }

  const form = new FormData()
  form.append('subject', subject)
  form.append('message', message)
  images.forEach((file) => form.append('images', file))
  videos.forEach((file) => form.append('videos', file))

  try {
    const { data } = await api.post('/contact', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    if (!data?.success) throw new Error(data?.error?.message || 'Request failed')
    return data.data
  } catch (e) {
    throwFriendly(e, 'Request failed')
  }
}
export const fetchMyContactMessages   = ()      => getJson('/contact')
export const fetchContactUnreadCount  = ()      => getJson('/contact/unread-reply-count')
export const markContactReplyRead     = (id)    => patchJson(`/contact/${id}/reply-read`, {})
export const markAllContactRepliesRead = ()     => patchJson('/contact/mark-all-replies-read', {})

// Admin side
export const fetchAdminMessages      = (status) => {
  const qs = status ? `?status=${status}` : ''
  return getJson(`/admin/messages${qs}`)
}
export const fetchAdminMessageUnreadCount = ()       => getJson('/admin/messages/unread-count')
export const adminMarkMessageRead         = (id)     => patchJson(`/admin/messages/${id}/read`, {})
export const adminReplyToMessage          = (id, reply) => patchJson(`/admin/messages/${id}/reply`, { adminReply: reply })
