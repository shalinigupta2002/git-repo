const { query } = require('../db/pool.js')

const MAX_LIMIT = 50
const DEFAULT_LIMIT = 10

/**
 * Cursor is a base64 encoding of `<created_at ISO>|<id>`.
 * Using a composite (created_at, id) cursor guarantees stable
 * ordering even when two rows share the exact same created_at.
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

function mapRow(row) {
  return {
    id: String(row.id),
    title: row.title,
    description: row.description,
    price: Number(row.price),
    imageUrl: row.image_url,
    createdAt: row.created_at,
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

/**
 * List products with infinite scroll + filters.
 *
 * @param {object} opts
 * @param {string=} opts.q        full-text search on title/description
 * @param {string=} opts.category category slug filter
 * @param {string=} opts.brand    brand name or slug filter (case-insensitive)
 * @param {string=} opts.cursor   opaque cursor for infinite scroll
 * @param {number=} opts.limit    page size (default 10, max 50)
 */
async function listProducts({ q, category, brand, cursor, limit } = {}) {
  const pageSize = normalizeLimit(limit)
  const decoded = decodeCursor(cursor)

  const where = []
  const params = []

  if (q && q.trim() !== '') {
    params.push(`%${q.trim()}%`)
    const idx = params.length
    where.push(`(p.title ILIKE $${idx} OR p.description ILIKE $${idx})`)
  }

  if (category && category.trim() !== '') {
    params.push(category.trim())
    where.push(`c.slug = $${params.length}`)
  }

  if (brand && brand.trim() !== '') {
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

  // Fetch one extra row to decide if there is a next page.
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
    FROM catalog.products p
    JOIN catalog.categories c ON c.id = p.category_id
    JOIN catalog.brands     b ON b.id = p.brand_id
    ${whereSql}
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT $${limitIdx}
  `

  const { rows } = await query(sql, params)

  const hasMore = rows.length > pageSize
  const pageRows = hasMore ? rows.slice(0, pageSize) : rows
  const products = pageRows.map(mapRow)

  let nextCursor = null
  if (hasMore && pageRows.length > 0) {
    const last = pageRows[pageRows.length - 1]
    nextCursor = encodeCursor(last.created_at, last.id)
  }

  return { products, nextCursor }
}

module.exports = {
  listProducts,
  encodeCursor,
  decodeCursor,
}
