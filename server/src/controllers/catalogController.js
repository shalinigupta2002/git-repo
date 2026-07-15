/**
 * Catalog Controller
 * ──────────────────────────────────────────────────────────────────────────────
 * Public product browsing for the marketing /products page.
 * Returns only live seller listings — no seeded reference catalog rows.
 */

const { asyncHandler } = require('../utils/asyncHandler.js')
const sellerBrowseService = require('../services/sellerBrowseService.js')

/**
 * GET /api/catalog/products
 *
 * Returns active seller listings for the public /products page.
 */
const listProducts = asyncHandler(async (req, res) => {
  const { q, category, brand, cursor, limit } = req.query
  const pageSize = Math.min(Math.max(Number.parseInt(limit, 10) || 12, 1), 50)

  const { products, nextCursor } = await sellerBrowseService.listSellerProducts({
    q,
    category,
    brand,
    cursor,
    limit: pageSize,
  })

  res.json({
    success: true,
    data: { products, nextCursor },
  })
})

/**
 * GET /api/catalog/products/:id
 *
 * Seller listing UUID only.
 */
const getProduct = asyncHandler(async (req, res) => {
  const product = await sellerBrowseService.getSellerProductById(req.params.id)

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
 * Derived from active seller listings (no seeded catalog categories).
 */
const listCategories = asyncHandler(async (req, res) => {
  const { products } = await sellerBrowseService.listSellerProducts({ limit: 500 })
  const seen = new Map()

  for (const product of products) {
    const name = product.category?.name
    const slug = product.category?.slug
    if (!name || !slug || seen.has(slug)) continue
    seen.set(slug, { id: slug, name, slug })
  }

  const categories = [...seen.values()].sort((a, b) => a.name.localeCompare(b.name))
  res.json({ success: true, data: { categories } })
})

/**
 * GET /api/catalog/brands
 *
 * Derived from active seller listings (no seeded catalog brands).
 */
const listBrands = asyncHandler(async (req, res) => {
  const { products } = await sellerBrowseService.listSellerProducts({ limit: 500 })
  const seen = new Map()

  for (const product of products) {
    const name = product.brand?.name
    const slug = product.brand?.slug
    if (!name || !slug || seen.has(slug)) continue
    seen.set(slug, { id: slug, name, slug })
  }

  const brands = [...seen.values()].sort((a, b) => a.name.localeCompare(b.name))
  res.json({ success: true, data: { brands } })
})

module.exports = { listProducts, getProduct, listCategories, listBrands }
