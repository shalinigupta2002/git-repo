import { env } from '../constants/env.js'

/**
 * Admin auth helpers.
 *
 * Admin authentication uses the same cookie-based flow as regular users
 * (the server sets an httpOnly `auth_token` cookie on login). There is no
 * separate admin token in localStorage.
 *
 * @deprecated Prefer `env.apiBaseUrl` from `constants/env.js`.
 */
export function getApiBaseUrl() {
  return env.apiBaseUrl
}
