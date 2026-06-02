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
const catalogService   = require('../services/catalogService.js')

/**
 * GET /api/catalog/products
 *
 * Query params:
 *   q        — full-text search on title/description
 *   category — category slug
 *   brand    — brand slug or name (case-insensitive)
 *   cursor   — opaque cursor from a previous response's nextCursor
 *   limit    — page size, 1–50 (default 10)
 */
const listProducts = asyncHandler(async (req, res) => {
  const { q, category, brand, cursor, limit } = req.query
  const { products, nextCursor } = await catalogService.listProducts({ q, category, brand, cursor, limit })

  res.json({
    success: true,
    data: { products, nextCursor },
  })
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

module.exports = { listProducts, listCategories, listBrands }
