'use strict'

const PUBLIC_FIELDS = ['marketplaceId', 'city']
const UNLOCKED_FIELDS = [
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

function pickUserCity(user) {
  return user?.addresses?.[0]?.city ?? null
}

function isProfileUnlocked({ dealAccepted, dealChargesPaid }) {
  return Boolean(dealAccepted && dealChargesPaid)
}

function pickMarketplaceId(user, role) {
  if (!user) return null
  if (role === 'BUYER') return user.buyerMarketplaceId ?? null
  if (role === 'SELLER') return user.sellerMarketplaceId ?? null
  return user.sellerMarketplaceId ?? user.buyerMarketplaceId ?? null
}

/**
 * Build a full party profile record (local DB today; Main Portal source later).
 */
function buildFullPartyProfile(user, role) {
  if (!user) return null
  const address = user.addresses?.[0]
  return {
    marketplaceId: pickMarketplaceId(user, role),
    city: pickUserCity(user),
    state: address?.state ?? null,
    companyName: user.companyName ?? null,
    contactPerson: null,
    phone: address?.phone ?? null,
    email: user.email ?? null,
    gst: null,
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

  return {
    rfqGroupId: request.rfqGroupId,
    rfqNumber: request.rfqNumber,
    buyerMarketplaceId: buyer?.marketplaceId ?? null,
    buyerCity: buyer?.city ?? null,
    sellerMarketplaceId: seller?.marketplaceId ?? null,
    sellerCity: seller?.city ?? null,
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
  pickUserCity,
  pickMarketplaceId,
  buildFullPartyProfile,
  maskCounterpartyProfile,
  serializeCounterpartyUser,
  buildPartyMetaFromRequest,
}
