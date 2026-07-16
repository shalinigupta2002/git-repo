/**
 * Auth storage utilities.
 *
 * JWT tokens are no longer stored in localStorage — they live in httpOnly
 * cookies managed exclusively by the server. Only the "intended route"
 * redirect helper remains here, which is safe to store in localStorage
 * because it contains no credentials.
 */

const INTENT_KEY = 'auth_intent'
const INTENT_TTL_MS = 10 * 60 * 1000

/**
 * Persist the route the user was trying to reach when they were bounced to
 * /login. Survives a full page refresh but is time-limited so stale intents
 * don't hijack future sign-ins.
 *
 * @param {string} pathname - Destination path, e.g. "/buyer/products".
 * @param {object=} meta    - Optional metadata (productId, action, etc.).
 */
export function setIntendedRoute(pathname, meta) {
  if (!pathname || typeof pathname !== 'string') return
  try {
    localStorage.setItem(
      INTENT_KEY,
      JSON.stringify({ pathname, meta: meta ?? null, ts: Date.now() }),
    )
  } catch {
    /* storage may be unavailable (private mode) — fail silently */
  }
}

export function getIntendedRoute() {
  try {
    const raw = localStorage.getItem(INTENT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.pathname) return null
    if (Date.now() - (parsed.ts || 0) > INTENT_TTL_MS) {
      localStorage.removeItem(INTENT_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function clearIntendedRoute() {
  try {
    localStorage.removeItem(INTENT_KEY)
  } catch {
    /* noop */
  }
}
