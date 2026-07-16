export function getSellerId(source) {
  if (!source) return null
  if (typeof source === 'string') return source
  return source.sellerId || source.seller?.id || source.id || null
}

export function getSellerCity(source) {
  if (!source) return null
  return source.sellerCity || source.seller?.city || source.city || null
}

export function formatSellerIdentity(source, { compact = false } = {}) {
  const sellerId = getSellerId(source)
  const city = getSellerCity(source)
  const idLabel = sellerId || '—'
  const cityLabel = city || '—'

  if (compact) {
    return `Seller ${idLabel} · ${cityLabel}`
  }

  return { sellerId: idLabel, city: cityLabel }
}
