import axios from 'axios'
import { env, isMisconfiguredProductionApi } from '../constants/env.js'
import {
  ApiErrorType,
  classifyError,
  isCanceledError,
  logApiFailure,
} from '../utils/apiError.js'

if (isMisconfiguredProductionApi) {
  console.error(
    '[api] Misconfigured: set Vercel env Name=VITE_API_BASE_URL, Value=https://your-service.onrender.com/api, then redeploy.',
  )
}

/**
 * Central Axios instance. ALL HTTP traffic in the app MUST go through this
 * module so auth, error handling and base-URL concerns stay in one place.
 *
 * Authentication is now cookie-based (httpOnly). The browser automatically
 * attaches the `auth_token` cookie on every request as long as
 * `withCredentials: true` is set. No manual header attachment needed.
 */
export const api = axios.create({
  baseURL: env.apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
  timeout: env.apiTimeout,
  withCredentials: true,
})

/**
 * Callback the auth bridge registers to clear Redux state when the server
 * tells us the token is no longer valid. Defaults to a no-op so `api` is
 * safe to use from non-React contexts (e.g. tests).
 */
let onUnauthorized = () => {}

export function setUnauthorizedHandler(fn) {
  onUnauthorized = typeof fn === 'function' ? fn : () => {}
}

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (isCanceledError(error)) return Promise.reject(error)

    logApiFailure(error)

    const type = classifyError(error)

    // Only fire the session-expired handler for authenticated routes.
    // Auth endpoints (login / register) legitimately return 401 for wrong
    // credentials — treating those as "session expired" would be misleading
    // and would spuriously dispatch logout().
    const url = error?.config?.url || ''
    // /auth/me 401 is handled by initializeAuth — avoid "session expired" loop on boot.
    const isAuthEndpoint = /\/auth\/(login|register|me|logout)/.test(url)

    if (type === ApiErrorType.UNAUTHORIZED && !isAuthEndpoint) {
      try {
        onUnauthorized()
      } catch {
        /* handler should not block rejection */
      }
    }

    return Promise.reject(error)
  },
)

export {
  ApiErrorType,
  classifyError,
  getErrorMessage,
  normalizeApiError,
} from '../utils/apiError.js'
