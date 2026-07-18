export function getPortalUserId(source) {
  if (!source) return null
  if (typeof source === 'string') return source
  return (
    source.portalUserId
    || source.user?.portalUserId
    || source.buyer?.portalUserId
    || source.seller?.portalUserId
    || source.buyerPortalUserId
    || source.sellerPortalUserId
    // Transition aliases — remove after legacy field sunset
    || source.buyerMarketplaceId
    || source.sellerMarketplaceId
    || source.seller?.marketplaceId
    || source.buyer?.marketplaceId
    || source.marketplaceId
    || null
  )
}

/** @deprecated Use getPortalUserId */
export function getSellerMarketplaceId(source) {
  return getPortalUserId(source)
}

/** @deprecated Use getPortalUserId — returns public user ID, not internal UUID. */
export function getSellerId(source) {
  return getPortalUserId(source)
}

/** @deprecated Use getPortalUserId */
export function getBuyerMarketplaceId(source) {
  return getPortalUserId(source)
}

export function getSellerCity(source) {
  if (!source) return null
  return source.sellerCity || source.seller?.city || source.city || null
}

export function getBuyerCity(source) {
  if (!source) return null
  return source.buyerCity || source.buyer?.city || source.city || null
}

export function formatSellerIdentity(source, { compact = false } = {}) {
  const portalUserId = getPortalUserId(source)
  const city = getSellerCity(source)
  const idLabel = portalUserId || '—'
  const cityLabel = city || '—'

  if (compact) {
    return `User ${idLabel} · ${cityLabel}`
  }

  return { portalUserId: idLabel, sellerMarketplaceId: idLabel, city: cityLabel }
}

export function formatBuyerIdentity(source, { compact = false } = {}) {
  const portalUserId = getPortalUserId(source)
  const city = getBuyerCity(source)
  const idLabel = portalUserId || '—'
  const cityLabel = city || '—'

  if (compact) {
    return `User ${idLabel} · ${cityLabel}`
  }

  return { portalUserId: idLabel, buyerMarketplaceId: idLabel, city: cityLabel }
}
