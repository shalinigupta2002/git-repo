/**
 * Counterparty profile visibility — mirrors server/src/services/counterpartyProfileService.js
 *
 * Before deal completion: marketplace ID + city only.
 * After deal accepted + deal charges paid: full profile from Main Portal.
 */

export const PUBLIC_COUNTERPARTY_FIELDS = ['marketplaceId', 'city']

export const UNLOCKED_COUNTERPARTY_FIELDS = [
  'marketplaceId',
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

export function isCounterpartyProfileUnlocked({ dealAccepted, dealChargesPaid } = {}) {
  return Boolean(dealAccepted && dealChargesPaid)
}

export function maskCounterpartyProfile(profile, context = {}) {
  const unlocked = isCounterpartyProfileUnlocked(context)
  const allowed = unlocked ? UNLOCKED_COUNTERPARTY_FIELDS : PUBLIC_COUNTERPARTY_FIELDS
  const masked = {}
  for (const key of allowed) {
    if (profile?.[key] != null && profile[key] !== '') masked[key] = profile[key]
  }
  masked.profileUnlocked = unlocked
  return masked
}
