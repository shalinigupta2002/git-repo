'use strict'

const PUBLIC_FIELDS = ['portalUserId', 'city']
const UNLOCKED_FIELDS = [
  'portalUserId',
  'city',
  'companyName',
  'contactPerson',
  'phone',
  'email',
  'gst',
  'address',
]

function pickUserCity(user) {
  return user?.addresses?.[0]?.city ?? null
}

function formatAddress(address, city, state, postalCode) {
  const parts = [
    address?.line1,
    address?.line2,
    city,
    state,
    postalCode,
  ].filter((part) => part != null && String(part).trim() !== '')

  return parts.length > 0 ? parts.join(', ') : null
}

function isProfileUnlocked(context = {}) {
  if (context.contactUnlockStatus === 'UNLOCKED') return true
  if (context.contactUnlockOverride === true) return true
  return false
}

function buildDealContactContext(deal) {
  if (!deal) return {}
  return {
    contactUnlockStatus: deal.contactUnlockStatus,
    contactUnlockOverride: deal.contactUnlockOverride,
  }
}

function pickPortalUserId(user) {
  return user?.portalUserId ?? null
}

/**
 * Build a full party profile record (local DB today; Main Portal source later).
 */
function buildFullPartyProfile(user, role) {
  if (!user) return null
  const address = user.addresses?.[0]
  const portalUserId = pickPortalUserId(user)
  const city = pickUserCity(user)

  return {
    portalUserId,
    /** @deprecated Transition alias — same as portalUserId */
    marketplaceId: portalUserId,
    city,
    companyName: user.companyName ?? null,
    contactPerson: user.contactPerson ?? user.fullName ?? null,
    phone: address?.phone ?? null,
    email: user.email ?? null,
    gst: user.gst ?? null,
    address: formatAddress(address, city, address?.state, address?.postalCode),
  }
}

function maskCounterpartyProfile(profile, context = {}) {
  if (!profile) return null
  const unlocked = isProfileUnlocked(context)
  const allowed = unlocked ? UNLOCKED_FIELDS : PUBLIC_FIELDS

  const masked = {}
  for (const key of allowed) {
    if (profile[key] !== undefined && profile[key] !== null && profile[key] !== '') {
      masked[key] = profile[key]
    }
  }
  if (profile.portalUserId) {
    masked.marketplaceId = profile.portalUserId
  }
  masked.profileUnlocked = unlocked
  return masked
}

/**
 * Serialize a user for counterparty-facing API responses (RFQ, Quote, Order, catalog).
 */
function serializeCounterpartyUser(user, role, context = {}) {
  return maskCounterpartyProfile(buildFullPartyProfile(user, role), context)
}

/** Pre-deal party meta for RFQ/quote list payloads (no internal UUIDs). */
function buildPartyMetaFromRequest(request, context = {}) {
  const buyer = serializeCounterpartyUser(request.buyer, 'BUYER', context)
  const seller = request.seller
    ? serializeCounterpartyUser(request.seller, 'SELLER', context)
    : null

  const buyerPortalUserId = buyer?.portalUserId ?? null
  const sellerPortalUserId = seller?.portalUserId ?? null

  return {
    rfqGroupId: request.rfqGroupId,
    rfqNumber: request.rfqNumber,
    buyerPortalUserId,
    sellerPortalUserId,
    buyerCity: buyer?.city ?? null,
    sellerCity: seller?.city ?? null,
    /** @deprecated Transition aliases */
    buyerMarketplaceId: buyerPortalUserId,
    sellerMarketplaceId: sellerPortalUserId,
    buyer,
    seller,
    deliveryLocation: request.deliveryLocation,
    expectedDeliveryDate: request.expectedDeliveryDate,
    attachments: request.attachments ?? [],
  }
}

module.exports = {
  PUBLIC_FIELDS,
  UNLOCKED_FIELDS,
  isProfileUnlocked,
  buildDealContactContext,
  pickUserCity,
  pickPortalUserId,
  formatAddress,
  buildFullPartyProfile,
  maskCounterpartyProfile,
  serializeCounterpartyUser,
  buildPartyMetaFromRequest,
}
