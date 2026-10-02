/** Paths available to sellers without an active subscription. */
export const SELLER_FREE_PATHS = Object.freeze([
  '/seller/dashboard',
  '/seller/products',
  '/seller/add-product',
  '/seller/product-listed',
])

export const SELLER_SUBSCRIBE_MESSAGE =
  'Subscribe to unlock deals, quotations, and advanced seller tools. Product listing stays free.'

export function isSellerFreePath(pathname) {
  if (!pathname) return false
  return SELLER_FREE_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  )
}

/** Default seller landing after auth when no explicit deep link applies. */
export function defaultSellerHomePath() {
  return '/seller/dashboard'
}

/**
 * For unsubscribed sellers, only free-tier listing flows are reachable; other paths fall back.
 * Subscribed sellers and non-matching paths return `requestedPath` unchanged.
 * @param {string} requestedPath
 * @param {boolean} hasSellerSubscription — from Redux / GET /api/subscriptions/status
 */
export function resolveSellerEntryPath(requestedPath, hasSellerSubscription = false) {
  if (!requestedPath) return defaultSellerHomePath()
  if (requestedPath === '/seller/welcome' || requestedPath.startsWith('/seller/welcome/')) {
    return requestedPath
  }
  if (hasSellerSubscription) return requestedPath
  return isSellerFreePath(requestedPath) ? requestedPath : defaultSellerHomePath()
}
