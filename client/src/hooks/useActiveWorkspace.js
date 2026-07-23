import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  WORKSPACE_CHANGE_EVENT,
  persistWorkspace,
  resolveActiveWorkspace,
} from '../utils/activeWorkspace.js'
import { canAccessBuyerWorkspace, canAccessSellerWorkspace } from '../utils/portalNav.js'

export function useActiveWorkspace({ role, hasBuyer, hasSeller }) {
  const { pathname } = useLocation()
  const buyerAccess = canAccessBuyerWorkspace(role, hasBuyer)
  const sellerAccess = canAccessSellerWorkspace(role, hasSeller)
  const hasBothWorkspaces = buyerAccess && sellerAccess

  const [activeWorkspace, setActiveWorkspaceState] = useState(() =>
    resolveActiveWorkspace({ pathname, buyerAccess, sellerAccess }),
  )

  useEffect(() => {
    setActiveWorkspaceState(resolveActiveWorkspace({ pathname, buyerAccess, sellerAccess }))
  }, [pathname, buyerAccess, sellerAccess])

  useEffect(() => {
    function onWorkspaceChange(event) {
      setActiveWorkspaceState(event.detail)
    }

    window.addEventListener(WORKSPACE_CHANGE_EVENT, onWorkspaceChange)
    return () => window.removeEventListener(WORKSPACE_CHANGE_EVENT, onWorkspaceChange)
  }, [])

  const setActiveWorkspace = useCallback((workspace) => {
    persistWorkspace(workspace)
    setActiveWorkspaceState(workspace)
  }, [])

  return {
    activeWorkspace,
    setActiveWorkspace,
    hasBothWorkspaces,
    buyerAccess,
    sellerAccess,
  }
}
