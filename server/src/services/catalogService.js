/**
 * Catalog Service
 * ──────────────────────────────────────────────────────────────────────────────
 * Reads from the `catalog` PostgreSQL schema via the raw pg Pool.
 *
 * RESPONSIBILITY: Browse-only, pre-populated reference catalog.
 *   - No authentication required (public browsing).
 *   - No seller ownership, no orders, no inventory.
 *   - Cursor-based infinite-scroll pagination for large result sets.
 *   - Tables: catalog.products, catalog.categories, catalog.brands
 *
 * This is intentionally SEPARATE from the Prisma-managed `public.products`
 * table, which handles the transactional B2B marketplace (seller listings,
 * orders, inventory, subscriptions).  See docs/architecture.md for details.
 */

const { query } = require('../db/pool.js')

const MAX_LIMIT     = 50
const DEFAULT_LIMIT = 10

// ─── Cursor helpers ───────────────────────────────────────────────────────────

/**
 * Encode a composite cursor from (created_at, id) so the ordering is stable
 * even when two rows share the exact same timestamp.
 */
function encodeCursor(createdAt, id) {
  const iso = createdAt instanceof Date ? createdAt.toISOString() : new Date(createdAt).toISOString()
  return Buffer.from(`${iso}|${id}`, 'utf8').toString('base64url')
}

function decodeCursor(cursor) {
  if (!cursor) return null
  try {
    const raw = Buffer.from(String(cursor), 'base64url').toString('utf8')
    const [iso, idStr] = raw.split('|')
    const ts = new Date(iso)
    const id = Number.parseInt(idStr, 10)
    if (Number.isNaN(ts.getTime()) || Number.isNaN(id)) return null
    return { createdAt: ts.toISOString(), id }
  } catch {
    return null
  }
}

function normalizeLimit(raw) {
  const n = Number.parseInt(raw, 10)
  if (Number.isNaN(n) || n <= 0) return DEFAULT_LIMIT
  return Math.min(n, MAX_LIMIT)
}

// ─── Row mappers ──────────────────────────────────────────────────────────────

function mapProduct(row) {
  return {
    id:          String(row.id),
    title:       row.title,
    description: row.description,
    price:       Number(row.price),
    imageUrl:    row.image_url,
    createdAt:   row.created_at,
    category: {
      slug: row.category_slug,
      name: row.category_name,
    },
    brand: {
      slug: row.brand_slug,
      name: row.brand_name,
    },
  }
}

function mapCategory(row) {
  return { id: row.id, name: row.name, slug: row.slug }
}

function mapBrand(row) {
  return { id: row.id, name: row.name, slug: row.slug }
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * List catalog products with optional full-text search, category/brand
 * filtering, and cursor-based pagination.
 *
 * @param {object}  opts
 * @param {string=} opts.q        Full-text search on title/description
 * @param {string=} opts.category Category slug filter
 * @param {string=} opts.brand    Brand slug or name filter (case-insensitive)
 * @param {string=} opts.cursor   Opaque pagination cursor from a previous response
 * @param {number=} opts.limit    Page size (default 10, max 50)
 * @returns {{ products: object[], nextCursor: string|null }}
 */
async function listProducts({ q, category, brand, cursor, limit } = {}) {
  const pageSize = normalizeLimit(limit)
  const decoded  = decodeCursor(cursor)

  const where  = []
  const params = []

  if (q && q.trim()) {
    params.push(`%${q.trim()}%`)
    const idx = params.length
    where.push(`(p.title ILIKE $${idx} OR p.description ILIKE $${idx})`)
  }

  if (category && category.trim()) {
    params.push(category.trim())
    const idx = params.length
    where.push(`(c.slug = $${idx} OR parent.slug = $${idx})`)
  }

  if (brand && brand.trim()) {
    params.push(brand.trim())
    const idx = params.length
    where.push(`(b.slug = $${idx} OR b.name ILIKE $${idx})`)
  }

  if (decoded) {
    params.push(decoded.createdAt)
    const tsIdx = params.length
    params.push(decoded.id)
    const idIdx = params.length
    where.push(`(p.created_at, p.id) < ($${tsIdx}::timestamptz, $${idIdx}::bigint)`)
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  // Fetch one extra row to detect whether a next page exists
  params.push(pageSize + 1)
  const limitIdx = params.length

  const sql = `
    SELECT
      p.id,
      p.title,
      p.description,
      p.price,
      p.image_url,
      p.created_at,
      c.slug AS category_slug,
      c.name AS category_name,
      b.slug AS brand_slug,
      b.name AS brand_name
    FROM catalog.products   p
    JOIN catalog.categories c      ON c.id = p.category_id
    LEFT JOIN catalog.categories parent ON parent.id = c.parent_id
    JOIN catalog.brands     b      ON b.id = p.brand_id
    ${whereSql}
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT $${limitIdx}
  `

  const { rows } = await query(sql, params)

  const hasMore  = rows.length > pageSize
  const pageRows = hasMore ? rows.slice(0, pageSize) : rows
  const products = pageRows.map(mapProduct)

  const nextCursor =
    hasMore && pageRows.length > 0
      ? encodeCursor(pageRows[pageRows.length - 1].created_at, pageRows[pageRows.length - 1].id)
      : null

  return { products, nextCursor }
}

/** Fetch a single catalog product by numeric id. Returns null when not found. */
async function getProductById(id) {
  const productId = Number.parseInt(String(id), 10)
  if (Number.isNaN(productId) || productId <= 0) return null

  const sql = `
    SELECT
      p.id,
      p.title,
      p.description,
      p.price,
      p.image_url,
      p.created_at,
      c.slug AS category_slug,
      c.name AS category_name,
      b.slug AS brand_slug,
      b.name AS brand_name
    FROM catalog.products   p
    JOIN catalog.categories c      ON c.id = p.category_id
    LEFT JOIN catalog.categories parent ON parent.id = c.parent_id
    JOIN catalog.brands     b      ON b.id = p.brand_id
    WHERE p.id = $1
    LIMIT 1
  `

  const { rows } = await query(sql, [productId])
  return rows[0] ? mapProduct(rows[0]) : null
}

/** Return all categories ordered alphabetically. */
async function listCategories() {
  const { rows } = await query(
    'SELECT id, name, slug FROM catalog.categories ORDER BY name ASC',
    [],
  )
  return rows.map(mapCategory)
}

/** Return all brands ordered alphabetically. */
async function listBrands() {
  const { rows } = await query(
    'SELECT id, name, slug FROM catalog.brands ORDER BY name ASC',
    [],
  )
  return rows.map(mapBrand)
}

module.exports = { listProducts, getProductById, listCategories, listBrands, encodeCursor, decodeCursor }
