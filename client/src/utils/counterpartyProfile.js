/**
 * Counterparty profile visibility — mirrors server/src/services/counterpartyProfileService.js
 *
 * Before contact unlock: portal user ID + city only.
 * After contact unlock: full profile fields returned by the deal API.
 */

export const PUBLIC_COUNTERPARTY_FIELDS = ['portalUserId', 'city']

export const UNLOCKED_COUNTERPARTY_FIELDS = [
  'portalUserId',
  'city',
  'state',
  'companyName',
  'contactPerson',
  'phone',
  'email',
  'gst',
  'addressLine1',
  'addressLine2',
  'postalCode',
]

export function isCounterpartyProfileUnlocked(context = {}) {
  if (context.contactUnlockStatus === 'UNLOCKED') return true
  return Boolean(context.dealAccepted && context.dealChargesPaid)
}

export function maskCounterpartyProfile(profile, context = {}) {
  const unlocked = isCounterpartyProfileUnlocked(context)
  const allowed = unlocked ? UNLOCKED_COUNTERPARTY_FIELDS : PUBLIC_COUNTERPARTY_FIELDS
  const masked = {}
  for (const key of allowed) {
    if (profile?.[key] != null && profile[key] !== '') masked[key] = profile[key]
  }
  if (profile?.portalUserId) {
    masked.marketplaceId = profile.portalUserId
  }
  masked.profileUnlocked = unlocked
  return masked
}
