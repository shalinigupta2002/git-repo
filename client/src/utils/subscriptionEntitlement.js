/**
 * Pure helpers for UI/route subscription gating (authoritative flags come from Redux / API).
 */

export function isSubscriptionStatusPending(status) {
  return status === 'idle' || status === 'loading'
}

/**
 * @returns {boolean|null} null while status is pending (caller should show loading)
 */
export function hasSubscriptionEntitlement(kind, { hasBuyer, hasSeller, status }) {
  if (isSubscriptionStatusPending(status)) return null
  if (status === 'failed') return false
  if (kind === 'buyer') return Boolean(hasBuyer)
  if (kind === 'seller') return Boolean(hasSeller)
  return true
}
