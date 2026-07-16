/**
 * Centralised helpers for normalising Axios/API errors into user-facing
 * messages. All services and UI code should go through these helpers
 * instead of reading `error.response.data` directly.
 */
import { env } from '../constants/env.js'

/**
 * Stable classification strings for every failure the frontend will see.
 * UI code can switch on these; services should keep them opaque.
 */
export const ApiErrorType = Object.freeze({
  CANCELED: 'CANCELED',
  TIMEOUT: 'TIMEOUT',
  NETWORK: 'NETWORK',
  CORS: 'CORS',
  /** Dev proxy or network: API host not accepting connections (e.g. backend not started). */
  BACKEND_UNAVAILABLE: 'BACKEND_UNAVAILABLE',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  /** Vercel/Render: frontend called wrong host (usually missing VITE_API_BASE_URL). */
  MISCONFIGURED_API: 'MISCONFIGURED_API',
  CLIENT: 'CLIENT',
  SERVER: 'SERVER',
  UNKNOWN: 'UNKNOWN',
})

const MESSAGES = Object.freeze({
  [ApiErrorType.TIMEOUT]:
    'The server took too long to respond. Please check your connection and try again.',
  [ApiErrorType.NETWORK]:
    'No internet connection. Reconnect and try again.',
  [ApiErrorType.BACKEND_UNAVAILABLE]:
    'Cannot reach the API server. Open a second terminal, go to the server folder, run npm run dev, and keep it running (default port 3001).',
  [ApiErrorType.CORS]:
    'The browser blocked this request (CORS). The backend needs to allow this origin.',
  [ApiErrorType.UNAUTHORIZED]:
    'Your session has expired. Please sign in again.',
  [ApiErrorType.FORBIDDEN]:
    'You do not have permission to perform this action.',
  [ApiErrorType.NOT_FOUND]:
    'We couldn’t find what you asked for. The endpoint may have moved.',
  [ApiErrorType.MISCONFIGURED_API]:
    'Cannot reach the API. On Vercel, set VITE_API_BASE_URL to your Render backend URL ending with /api (example: https://your-service.onrender.com/api), then redeploy.',
  [ApiErrorType.CLIENT]:
    'The request was invalid. Please adjust and try again.',
  [ApiErrorType.SERVER]:
    'The server ran into a problem. Please try again in a moment.',
  [ApiErrorType.UNKNOWN]:
    'Something went wrong. Please try again.',
})

const GENERIC_MESSAGE = MESSAGES[ApiErrorType.UNKNOWN]

/** Returns true for Axios cancellations so callers can ignore them silently. */
export function isCanceledError(error) {
  return error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED'
}

/**
 * Best-effort browser online check. Defaults to `true` when Navigator is
 * unavailable (SSR / non-DOM contexts) so we don't mis-classify as offline.
 */
function isBrowserOnline() {
  if (typeof navigator === 'undefined') return true
  return typeof navigator.onLine === 'boolean' ? navigator.onLine : true
}

/** True when the body matches our Express `{ success: false, error: { message } }` shape. */
function isOurApiEnvelope(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false
  if (data.success !== false) return false
  if (!data.error || typeof data.error !== 'object') return false
  return typeof data.error.message === 'string'
}

/**
 * Classify an axios/fetch error into one of the `ApiErrorType` buckets.
 *
 * CORS note: the browser deliberately masks CORS failures as generic
 * "Network Error" with status 0 and no response headers, to prevent leaking
 * cross-origin info. We can therefore only *infer* CORS — when the device
 * reports it's online and axios could not reach the server at all, CORS is
 * the most likely culprit after true network loss.
 */
export function classifyError(error) {
  if (!error) return ApiErrorType.UNKNOWN
  if (isCanceledError(error)) return ApiErrorType.CANCELED

  if (error.code === 'ECONNABORTED' || /timeout/i.test(error.message || '')) {
    return ApiErrorType.TIMEOUT
  }

  const status = error.response?.status ?? 0

  if (!error.response) {
    if (!isBrowserOnline()) return ApiErrorType.NETWORK
    // In local dev, failed connection to localhost is almost always "API not running", not CORS.
    if (
      env.isDev &&
      (error.message === 'Network Error' || error.code === 'ERR_NETWORK')
    ) {
      return ApiErrorType.BACKEND_UNAVAILABLE
    }
    if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
      return ApiErrorType.CORS
    }
    return ApiErrorType.NETWORK
  }

  if (status === 401) return ApiErrorType.UNAUTHORIZED
  if (status === 403) return ApiErrorType.FORBIDDEN
  if (status === 404) {
    const ct = String(error.response?.headers?.['content-type'] || '')
    if (ct.includes('text/html')) return ApiErrorType.MISCONFIGURED_API
    return ApiErrorType.NOT_FOUND
  }

  if (status >= 500) {
    // Vite (and other dev proxies) often return HTTP 500 when the upstream API is down.
    // Those responses are not our JSON error envelope.
    if (
      (status === 500 || status === 502 || status === 503 || status === 504) &&
      !isOurApiEnvelope(error.response?.data)
    ) {
      return ApiErrorType.BACKEND_UNAVAILABLE
    }
    return ApiErrorType.SERVER
  }
  if (status >= 400) return ApiErrorType.CLIENT
  return ApiErrorType.UNKNOWN
}

/**
 * Resolve the request endpoint (METHOD + URL) from an axios error. Falls
 * back to `'<unknown request>'` if the error didn't come from axios or the
 * request config was lost (e.g. thrown before dispatch).
 */
export function describeEndpoint(error) {
  const cfg = error?.config
  if (!cfg) return '<unknown request>'
  const method = (cfg.method || 'get').toUpperCase()
  const baseURL = cfg.baseURL?.replace(/\/$/, '') || ''
  const url = cfg.url || ''
  const full = url.startsWith('http') ? url : `${baseURL}${url}`
  return `${method} ${full || '<no url>'}`
}

/**
 * Extract the most useful message from an arbitrary error. Prefers the
 * backend-supplied message when present, else falls back to the classified
 * default, else the provided fallback string.
 */
export function getErrorMessage(error, fallback = GENERIC_MESSAGE) {
  if (!error) return fallback
  if (typeof error === 'string') return error || fallback

  const data = error.response?.data
  if (data?.error?.message) return data.error.message
  if (typeof data?.message === 'string' && data.message) return data.message

  const type = classifyError(error)
  if (MESSAGES[type]) return MESSAGES[type]

  if (typeof error.message === 'string' && error.message) return error.message
  return fallback
}

/**
 * Normalize an Axios error into a stable `{ type, status, code, endpoint,
 * message, details, raw }` envelope. Services should reach for this when
 * they need more than the user-facing message.
 */
export function normalizeApiError(error, fallbackMessage = GENERIC_MESSAGE) {
  const type = classifyError(error)
  const status = error?.response?.status ?? null
  const endpoint = describeEndpoint(error)
  const data = error?.response?.data
  const message = getErrorMessage(error, fallbackMessage)
  const code = data?.error?.code || data?.code || type

  return {
    type,
    status,
    code,
    endpoint,
    message,
    details: data?.error?.details ?? null,
    raw: error,
  }
}

/**
 * Development-only structured console logger for API failures.
 *
 * Prints a single grouped entry per failure, including the exact endpoint,
 * HTTP status, classification, server-supplied error payload (if any), and
 * the raw axios error for inspection. Never logs request headers or bodies,
 * so tokens stay out of the console.
 *
 * No-op in production builds.
 */
export function logApiFailure(error, extra = {}) {
  if (!env.isDev) return
  if (isCanceledError(error)) return
  if (typeof console === 'undefined') return

  const info = normalizeApiError(error)
  const label = `[API ${info.type}] ${info.endpoint}${
    info.status ? ` → ${info.status}` : ''
  }`

  try {
    console.groupCollapsed(label)
    console.log('type:      ', info.type)
    console.log('status:    ', info.status ?? '(no response)')
    console.log('endpoint:  ', info.endpoint)
    console.log('message:   ', info.message)
    if (info.details) console.log('details:   ', info.details)
    if (Object.keys(extra).length) console.log('context:   ', extra)
    console.log('raw:       ', error)
    console.groupEnd()
  } catch {
    console.warn(label, info.message)
  }
}

/**
 * Throws a new Error whose `message` is user-friendly. Convenience wrapper for
 * service call-sites that want to re-throw but preserve the original stack via
 * `cause`, and attaches the classified `type`/`status`/`endpoint` on the new
 * Error so downstream UI can branch on them.
 */
export function throwFriendly(error, fallbackMessage = GENERIC_MESSAGE) {
  if (isCanceledError(error)) throw error
  const info = normalizeApiError(error, fallbackMessage)
  const wrapped = new Error(info.message, { cause: error })
  wrapped.type = info.type
  wrapped.status = info.status
  wrapped.endpoint = info.endpoint
  wrapped.code = info.code
  throw wrapped
}
