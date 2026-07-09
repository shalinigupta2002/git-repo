/**
 * Catalog Controller
 * ──────────────────────────────────────────────────────────────────────────────
 * Handles public (unauthenticated) product browsing via the `catalog` schema.
 *
 * RESPONSIBILITY: Read-only reference catalog for buyer/visitor browsing.
 *   All responses use the same { success, data: { ... } } envelope as the
 *   rest of the API so the frontend has one consistent shape to handle.
 *
 * Related to — but DISTINCT from — the Prisma-managed product system:
 *   Catalog  → GET /api/catalog/*  → browse-only, pre-seeded data
 *   Products → /api/products/*     → seller-owned, transactional, auth-gated
 */

const { asyncHandler } = require('../utils/asyncHandler.js')
const catalogService = require('../services/catalogService.js')
const sellerBrowseService = require('../services/sellerBrowseService.js')

function mergeBrowseProducts(catalogProducts, sellerProducts) {
  const seen = new Set()
  const merged = []

  for (const product of [...sellerProducts, ...catalogProducts]) {
    const key = `${product.source || 'catalog'}:${product.id}`
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(product)
  }

  return merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

/**
 * GET /api/catalog/products
 *
 * Returns seeded catalog products merged with live seller listings so newly
 * added seller products appear on the public /products page.
 */
const listProducts = asyncHandler(async (req, res) => {
  const { q, category, brand, cursor, limit } = req.query
  const pageSize = Math.min(Math.max(Number.parseInt(limit, 10) || 12, 1), 50)

  if (cursor) {
    const { products, nextCursor } = await catalogService.listProducts({
      q,
      category,
      brand,
      cursor,
      limit: pageSize,
    })
    return res.json({
      success: true,
      data: { products, nextCursor },
    })
  }

  const [{ products: catalogProducts, nextCursor }, sellerProducts] = await Promise.all([
    catalogService.listProducts({ q, category, brand, limit: pageSize }),
    sellerBrowseService.listSellerProducts({ q, category, brand, limit: 200 }),
  ])

  const products = mergeBrowseProducts(catalogProducts, sellerProducts).slice(0, pageSize)

  res.json({
    success: true,
    data: { products, nextCursor },
  })
})

/**
 * GET /api/catalog/products/:id
 *
 * Catalog numeric ids first; fall back to seller listing UUIDs.
 */
const getProduct = asyncHandler(async (req, res) => {
  let product = await catalogService.getProductById(req.params.id)
  if (!product) {
    product = await sellerBrowseService.getSellerProductById(req.params.id)
  }

  if (!product) {
    return res.status(404).json({
      success: false,
      error: { message: 'Product not found' },
    })
  }

  res.json({ success: true, data: { product } })
})

/**
 * GET /api/catalog/categories
 *
 * Returns all categories, ordered alphabetically.
 * Useful for populating filter/browse UI without an extra round-trip.
 */
const listCategories = asyncHandler(async (req, res) => {
  const categories = await catalogService.listCategories()
  res.json({ success: true, data: { categories } })
})

/**
 * GET /api/catalog/brands
 *
 * Returns all brands, ordered alphabetically.
 */
const listBrands = asyncHandler(async (req, res) => {
  const brands = await catalogService.listBrands()
  res.json({ success: true, data: { brands } })
})

module.exports = { listProducts, getProduct, listCategories, listBrands }
