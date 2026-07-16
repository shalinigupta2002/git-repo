const SELLER_SUB_KEY = 'seller_subscription_active'

/** Paths available to sellers without an active subscription. */
export const SELLER_FREE_PATHS = Object.freeze([
  '/seller/dashboard',
  '/seller/products',
  '/seller/add-product',
  '/seller/product-listed',
])

export const SELLER_SUBSCRIBE_MESSAGE =
  'Subscribe to unlock deals, quotations, and advanced seller tools. Product listing stays free.'

export function hasActiveSellerSubscription() {
  return localStorage.getItem(SELLER_SUB_KEY) === '1'
}

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
 */
export function resolveSellerEntryPath(requestedPath) {
  if (!requestedPath) return defaultSellerHomePath()
  if (requestedPath === '/seller/welcome' || requestedPath.startsWith('/seller/welcome/')) {
    return requestedPath
  }
  if (hasActiveSellerSubscription()) return requestedPath
  return isSellerFreePath(requestedPath) ? requestedPath : defaultSellerHomePath()
}

export function setSellerSubscriptionActive() {
  localStorage.setItem(SELLER_SUB_KEY, '1')
}

export function clearSellerSubscription() {
  localStorage.removeItem(SELLER_SUB_KEY)
}
