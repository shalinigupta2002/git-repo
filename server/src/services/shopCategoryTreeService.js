const fs = require('fs')
const path = require('path')

function normalizeCategoryName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/moblie/g, 'mobile')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Top-level category labels from the client shop tree file. */
function loadTopLevelCategoryLabels() {
  const labels = []
  try {
    const treePath = path.join(__dirname, '../../../client/src/utils/shopCategoryTree.js')
    const source = fs.readFileSync(treePath, 'utf8')
    const treeStart = source.indexOf('export const SHOP_CATEGORY_TREE = [')
    if (treeStart < 0) return labels

    const slice = source.slice(treeStart)
    for (const match of slice.matchAll(/label:\s*'([^']+)'/g)) {
      labels.push(match[1])
    }
  } catch {
    // Ignore when tree file is unavailable in production bundles.
  }
  return labels
}

/**
 * Resolve parent category name for catalog insert when admin approves a request.
 * Handles typos like "Moblie" vs "Mobile" in parent names.
 */
function resolveParentCategoryLabel(requestedParentName) {
  const needle = normalizeCategoryName(requestedParentName)
  if (!needle) return requestedParentName

  const labels = loadTopLevelCategoryLabels()
  const hit = labels.find((label) => normalizeCategoryName(label) === needle)
  return hit || requestedParentName
}

module.exports = {
  normalizeCategoryName,
  resolveParentCategoryLabel,
}
