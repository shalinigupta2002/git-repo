import { resolveUploadUrl } from './uploadUrl.js'

/** Parse product.images from API (array or JSON string). */
export function parseProductImages(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

/** Deterministic inline SVG placeholder — never uses random external URLs. */
export function getProductImagePlaceholder(productId, { width = 600, height = 600 } = {}) {
  const seed = encodeURIComponent(String(productId || 'product').slice(0, 40))
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect fill="#f1f5f9" width="100%" height="100%"/>`,
    `<path d="M${width * 0.18} ${height * 0.68} L${width * 0.36} ${height * 0.4} L${width * 0.5} ${height * 0.54} L${width * 0.7} ${height * 0.3} L${width * 0.82} ${height * 0.68} Z" fill="#cbd5e1"/>`,
    `<circle cx="${width * 0.36}" cy="${height * 0.3}" r="${Math.max(8, Math.min(width, height) * 0.07)}" fill="#94a3b8"/>`,
    `<text x="50%" y="88%" text-anchor="middle" fill="#64748b" font-family="system-ui,sans-serif" font-size="${Math.max(12, Math.round(width * 0.04))}">No image</text>`,
    `<title>${seed}</title>`,
    '</svg>',
  ].join('')
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

function firstImageUrlFromImages(images) {
  const list = parseProductImages(images)
  const hit = list.find((item) => item?.url)
  return hit?.url ?? null
}

/** Resolve the primary image URL for a catalog or listing product. */
export function resolveProductImageUrl(product) {
  if (!product) return ''

  const imageUrl = product.imageUrl ?? firstImageUrlFromImages(product.images)
  if (!imageUrl) return ''

  if (/^(https?:|data:|blob:)/i.test(imageUrl)) return imageUrl

  if (product.source === 'seller' || imageUrl.startsWith('/api/uploads/')) {
    return resolveUploadUrl(imageUrl)
  }

  return imageUrl
}

/** Preferred src for product cards and detail pages. */
export function getProductDisplayImageSrc(product, options) {
  const resolved = resolveProductImageUrl(product)
  return resolved || getProductImagePlaceholder(product?.id, options)
}
