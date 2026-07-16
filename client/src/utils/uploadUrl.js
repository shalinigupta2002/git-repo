import { getApiOrigin } from '../constants/env.js'

/** Turn API-relative upload paths into absolute URLs for img/video src. */
export function resolveUploadUrl(url) {
  if (!url || typeof url !== 'string') return ''
  if (/^https?:\/\//i.test(url)) return url
  const origin = getApiOrigin()
  const path = url.startsWith('/') ? url : `/${url}`
  return `${origin}${path}`
}

export function parseContactAttachments(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}
