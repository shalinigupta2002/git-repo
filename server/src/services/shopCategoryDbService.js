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

module.exports = {
  fetchActiveCategoryTree,
  buildTree,
}
