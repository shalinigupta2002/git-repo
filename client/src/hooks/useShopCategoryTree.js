import { useCallback, useEffect, useState } from 'react'
import { fetchShopCategories } from '../services/shopCategory.service.js'

/**
 * Active category tree from GET /api/shop-categories (admin-managed DB).
 * Refetches on mount and window focus — no hardcoded tree, no stale cache.
 */
export function useShopCategoryTree() {
  const [tree, setTree] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const next = await fetchShopCategories()
      setTree(next)
    } catch (err) {
      setError(err)
      setTree([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  useEffect(() => {
    const onFocus = () => reload()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [reload])

  return { tree, loading, error, reload }
}

/** Returns true when stored category id is not in the active tree. */
export function isCategorySelectionInvalid(tree, { category, subcategory, subsubcategory } = {}) {
  if (!category) return false
  const top = tree.find((node) => node.id === category)
  if (!top) return true
  if (subcategory) {
    const sub = top.children?.find((node) => node.id === subcategory)
    if (!sub) return true
    if (subsubcategory) {
      const subsub = sub.children?.find((node) => node.id === subsubcategory)
      if (!subsub) return true
    }
  }
  return false
}

/** Find node label path for display warnings. */
export function findNodeInTree(tree, id) {
  for (const node of tree) {
    if (node.id === id) return node
    for (const child of node.children ?? []) {
      if (child.id === id) return child
      for (const grand of child.children ?? []) {
        if (grand.id === id) return grand
      }
    }
  }
  return null
}
