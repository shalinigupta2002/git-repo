export function getSellerMarketplaceId(source) {
  if (!source) return null
  if (typeof source === 'string') return source
  return (
    source.sellerMarketplaceId
    || source.seller?.marketplaceId
    || source.marketplaceId
    || null
  )
}

/** @deprecated Use getSellerMarketplaceId — returns marketplace ID, not internal UUID. */
export function getSellerId(source) {
  return getSellerMarketplaceId(source)
}

export function getBuyerMarketplaceId(source) {
  if (!source) return null
  if (typeof source === 'string') return source
  return (
    source.buyerMarketplaceId
    || source.buyer?.marketplaceId
    || source.marketplaceId
    || null
  )
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
  const marketplaceId = getSellerMarketplaceId(source)
  const city = getSellerCity(source)
  const idLabel = marketplaceId || '—'
  const cityLabel = city || '—'

  if (compact) {
    return `Seller ${idLabel} · ${cityLabel}`
  }

  return { sellerMarketplaceId: idLabel, city: cityLabel }
}

export function formatBuyerIdentity(source, { compact = false } = {}) {
  const marketplaceId = getBuyerMarketplaceId(source)
  const city = getBuyerCity(source)
  const idLabel = marketplaceId || '—'
  const cityLabel = city || '—'

  if (compact) {
    return `Buyer ${idLabel} · ${cityLabel}`
  }

  return { buyerMarketplaceId: idLabel, city: cityLabel }
}
