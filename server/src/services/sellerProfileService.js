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

function mapPublicUser(user) {
  if (!user) return null
  return {
    id: user.id,
    email: user.email,
    companyName: user.companyName,
    city: pickUserCity(user),
  }
}

module.exports = {
  USER_PUBLIC_SELECT,
  pickUserCity,
  mapPublicUser,
}
