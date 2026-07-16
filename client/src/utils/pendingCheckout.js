/**
 * Remembers which Razorpay plan the user chose on /pricing before sign-in,
 * so checkout can open automatically after they return from /login.
 */

const KEY = 'b2b_pending_checkout'
const TTL_MS = 15 * 60 * 1000

export function setPendingCheckout(plan) {
  if (!plan || typeof plan !== 'string') return
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ plan, ts: Date.now() }))
  } catch {
    /* private mode */
  }
}

/** Returns and clears the pending plan id, or null if missing/expired. */
export function takePendingCheckout() {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    sessionStorage.removeItem(KEY)
    const parsed = JSON.parse(raw)
    if (!parsed?.plan) return null
    if (Date.now() - (parsed.ts || 0) > TTL_MS) return null
    return parsed.plan
  } catch {
    return null
  }
}

export function clearPendingCheckout() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* noop */
  }
}
