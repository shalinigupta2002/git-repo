'use strict'

const PUBLIC_FIELDS = ['portalUserId', 'city']
const UNLOCKED_FIELDS = [
  'portalUserId',
  'city',
  'state',
  'companyName',
  'contactPerson',
  'phone',
  'email',
  'gst',
  'website',
  'businessDescription',
  'addressLine1',
  'addressLine2',
  'postalCode',
]

function pickUserCity(user) {
  return user?.addresses?.[0]?.city ?? null
}

function isProfileUnlocked(context = {}) {
  if (context.contactUnlockStatus === 'UNLOCKED') return true
  if (context.contactUnlockOverride === true) return true
  return Boolean(context.dealAccepted && context.dealChargesPaid)
}

function buildDealContactContext(deal) {
  if (!deal) return {}
  return {
    contactUnlockStatus: deal.contactUnlockStatus,
    contactUnlockOverride: deal.contactUnlockOverride,
    dealAccepted: true,
    dealChargesPaid: deal.contactUnlockStatus === 'UNLOCKED',
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
  return {
    portalUserId,
    /** @deprecated Transition alias — same as portalUserId */
    marketplaceId: portalUserId,
    city: pickUserCity(user),
    state: address?.state ?? null,
    companyName: user.companyName ?? null,
    contactPerson: null,
    phone: address?.phone ?? null,
    email: user.email ?? null,
    gst: null,
    website: null,
    businessDescription: user.companyName ?? null,
    addressLine1: address?.line1 ?? null,
    addressLine2: address?.line2 ?? null,
    postalCode: address?.postalCode ?? null,
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
  buildFullPartyProfile,
  maskCounterpartyProfile,
  serializeCounterpartyUser,
  buildPartyMetaFromRequest,
}
