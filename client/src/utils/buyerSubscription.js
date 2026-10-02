/** Paths available to buyers without an active subscription. */
export const BUYER_FREE_PATHS = Object.freeze([
  '/buyer/dashboard',
  '/products',
  '/buyer/quotations',
])

export const BUYER_SUBSCRIBE_MESSAGE =
  'Subscribe to unlock wishlist, transactions, and full buyer quotation tools.'

export function isBuyerFreePath(pathname) {
  if (!pathname) return false
  return BUYER_FREE_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  )
}
