const {
  serializeCounterpartyUser,
  buildPartyMetaFromRequest,
  pickUserCity,
} = require('./counterpartyProfileService.js')

/** Prisma select for counterparty resolution — includes marketplace IDs, not exposed raw. */
const USER_PUBLIC_SELECT = {
  id: true,
  email: true,
  companyName: true,
  buyerMarketplaceId: true,
  sellerMarketplaceId: true,
  addresses: {
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    take: 1,
    select: {
      city: true,
      state: true,
      line1: true,
      line2: true,
      postalCode: true,
      phone: true,
    },
  },
}

/**
 * Marketplace-safe party profile for counterparty views.
 * @param {object} user Prisma user row
 * @param {'BUYER'|'SELLER'} role
 * @param {object} [context] Deal unlock context for future phases
 */
function mapMaskedParty(user, role = 'SELLER', context = {}) {
  return serializeCounterpartyUser(user, role, context)
}

/** @deprecated Prefer mapMaskedParty with explicit role. */
function mapPublicUser(user, role = 'SELLER', context = {}) {
  return mapMaskedParty(user, role, context)
}

module.exports = {
  USER_PUBLIC_SELECT,
  pickUserCity,
  mapMaskedParty,
  mapPublicUser,
  buildPartyMetaFromRequest,
}
