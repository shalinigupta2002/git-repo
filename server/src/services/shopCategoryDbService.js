/**
 * Active shop category tree from catalog.categories (admin-managed source of truth).
 */

const { query } = require('../db/pool.js')

function mapRowToNode(row) {
  return {
    id: String(row.slug || row.id),
    dbId: row.id,
    label: row.name,
    slug: row.slug,
    parentId: row.parent_id,
    children: [],
  }
}

function buildTree(rows) {
  const map = {}
  const roots = []

  for (const row of rows) {
    map[row.id] = mapRowToNode(row)
  }

  for (const row of rows) {
    const node = map[row.id]
    if (row.parent_id && map[row.parent_id]) {
      map[row.parent_id].children.push(node)
    } else if (!row.parent_id) {
      roots.push(node)
    }
  }

  const sortNodes = (list) => {
    list.sort((a, b) => a.label.localeCompare(b.label))
    for (const node of list) {
      if (node.children.length) sortNodes(node.children)
    }
  }
  sortNodes(roots)

  return roots
}

async function fetchActiveCategoryTree() {
  const { rows } = await query(
    `SELECT id, name, slug, parent_id, created_at
     FROM catalog.categories
     ORDER BY COALESCE(parent_id, id), name ASC`,
    [],
  )
  return buildTree(rows)
}

async function ensureDefaultCategories() {
  const path = require('path')
  const { rows } = await query('SELECT COUNT(*)::int as count FROM catalog.categories', [])
  if (rows[0].count > 0) return

  const constantsPath = path.join(__dirname, '../../prisma/seed/constants.js')
  const helpersPath = path.join(__dirname, '../../prisma/seed/helpers.js')
  const { CATALOG } = require(constantsPath)
  const { slugify } = require(helpersPath)

  for (const cat of CATALOG) {
    const { rows: catRows } = await query(
      `INSERT INTO catalog.categories (name, slug, parent_id)
       VALUES ($1, $2, NULL)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [cat.name, cat.slug],
    )
    const parentId = catRows[0].id

    for (const sub of cat.subcategories) {
      const subSlug = `${cat.slug}-${slugify(sub)}`
      await query(
        `INSERT INTO catalog.categories (name, slug, parent_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, parent_id = EXCLUDED.parent_id`,
        [sub, subSlug, parentId],
      )
    }
  }
}

module.exports = {
  fetchActiveCategoryTree,
  buildTree,
  ensureDefaultCategories,
}
