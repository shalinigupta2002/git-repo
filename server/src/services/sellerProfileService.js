/** Prisma select for public seller/buyer profile fields including default city. */
const USER_PUBLIC_SELECT = {
  id: true,
  email: true,
  companyName: true,
  addresses: {
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    take: 1,
    select: { city: true },
  },
}

function pickUserCity(user) {
  return user?.addresses?.[0]?.city ?? null
}

/** Marketplace-safe party profile: ID and city only (no contact or company). */
function mapMaskedParty(user) {
  if (!user) return null
  return {
    id: user.id,
    city: pickUserCity(user),
  }
}

/** @deprecated Prefer mapMaskedParty for marketplace API responses. */
function mapPublicUser(user) {
  return mapMaskedParty(user)
}

module.exports = {
  USER_PUBLIC_SELECT,
  pickUserCity,
  mapMaskedParty,
  mapPublicUser,
}
