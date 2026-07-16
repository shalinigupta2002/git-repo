import { useEffect, useState } from 'react'
import {
  SHOP_CATEGORY_TREE,
  mergeApprovedCategoryRequests,
} from '../utils/shopCategoryTree.js'
import { fetchApprovedCategoryRequests } from '../services/categoryRequest.service.js'

export function useShopCategoryTree() {
  const [tree, setTree] = useState(SHOP_CATEGORY_TREE)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true

    fetchApprovedCategoryRequests()
      .then((data) => {
        if (!alive) return
        const approved = Array.isArray(data?.requests) ? data.requests : []
        setTree(mergeApprovedCategoryRequests(SHOP_CATEGORY_TREE, approved))
      })
      .catch(() => {
        if (!alive) return
        setTree(SHOP_CATEGORY_TREE)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [])

  return { tree, loading }
}
