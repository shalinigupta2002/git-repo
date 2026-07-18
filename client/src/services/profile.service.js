import { api } from './api.js'
import { throwFriendly } from '../utils/apiError.js'

const MAIN_PORTAL_PLACEHOLDER = 'Will be synced from Main Portal'

function toDisplayField(value, { placeholder = null, emptyDisplay = '—' } = {}) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return {
      value: null,
      display: placeholder ?? emptyDisplay,
      syncedFromMainPortal: false,
    }
  }
  return {
    value,
    display: String(value),
    syncedFromMainPortal: false,
  }
}

function mapSubscriptionCard(card) {
  if (!card) return null
  return {
    plan: toDisplayField(card.plan),
    status: toDisplayField(card.status),
    startDate: toDisplayField(card.startDate),
    expiryDate: toDisplayField(card.expiryDate),
  }
}

/**
 * Maps hybrid API response into the existing UI field contract.
 * UI components stay unchanged; only this adapter updates when API evolves.
 */
export function normalizeProfileView(apiView) {
  if (!apiView) return null

  const profile = apiView.profile ?? {}

  return {
    source: apiView.source,
    mainPortalIntegrated: apiView.mainPortalIntegrated,
    manageProfileUrl: apiView.manageProfileUrl,
    profileInformation: {
      profilePhoto: toDisplayField(profile.profilePhoto, { emptyDisplay: null }),
      fullName: toDisplayField(profile.fullName, { placeholder: MAIN_PORTAL_PLACEHOLDER }),
      portalUserId: toDisplayField(profile.portalUserId, { emptyDisplay: 'No User ID assigned' }),
      email: toDisplayField(profile.email),
      mobileNumber: toDisplayField(profile.phone, { placeholder: MAIN_PORTAL_PLACEHOLDER }),
      companyName: toDisplayField(profile.company, { placeholder: MAIN_PORTAL_PLACEHOLDER }),
      gstNumber: toDisplayField(profile.gst, { placeholder: MAIN_PORTAL_PLACEHOLDER }),
      address: toDisplayField(profile.address, { placeholder: MAIN_PORTAL_PLACEHOLDER }),
      city: toDisplayField(profile.city, { placeholder: MAIN_PORTAL_PLACEHOLDER }),
      state: toDisplayField(profile.state, { placeholder: MAIN_PORTAL_PLACEHOLDER }),
      country: toDisplayField(profile.country, { placeholder: MAIN_PORTAL_PLACEHOLDER }),
      kycStatus: toDisplayField(profile.kycStatus, { emptyDisplay: 'Pending verification' }),
    },
    subscriptions: {
      buyer: mapSubscriptionCard(apiView.subscriptions?.buyer),
      seller: mapSubscriptionCard(apiView.subscriptions?.seller),
    },
    marketplaceCapabilities: apiView.marketplaceCapabilities ?? null,
  }
}

/**
 * Read-only profile view — hybrid Main Portal profile + marketplace subscriptions.
 */
export async function fetchProfileView() {
  try {
    const { data } = await api.get('/profile')
    if (!data.success) throw new Error(data.error?.message || 'Failed to load profile')
    return normalizeProfileView(data.data)
  } catch (e) {
    throwFriendly(e, 'Could not load profile')
  }
}
