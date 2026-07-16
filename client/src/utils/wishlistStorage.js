const KEY = 'b2b_catalog_wishlist'

function readRaw() {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeRaw(items) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(KEY, JSON.stringify(items))
  window.dispatchEvent(new CustomEvent('wishlist:changed', { detail: { items } }))
}

export function getWishlistItems() {
  return readRaw()
}

export function getWishlistIds() {
  return new Set(readRaw().map((item) => String(item.id)))
}

export function addWishlistItem(product) {
  const id = String(product?.id || '')
  if (!id) return readRaw()

  const items = readRaw()
  if (items.some((item) => String(item.id) === id)) return items

  const next = [
    {
      id,
      title: product.title,
      price: product.price,
      imageUrl: product.imageUrl,
      category: product.category || null,
      brand: product.brand || null,
      source: product.source || 'catalog',
      seller: product.seller || null,
      addedAt: new Date().toISOString(),
    },
    ...items,
  ]
  writeRaw(next)
  return next
}

export function removeWishlistItem(id) {
  const next = readRaw().filter((item) => String(item.id) !== String(id))
  writeRaw(next)
  return next
}
