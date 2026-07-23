import { isBuyerSection, isSellerSection } from './portalNav.js'

export const WORKSPACE_STORAGE_KEY = 'b2b.activeWorkspace'
export const WORKSPACE_CHANGE_EVENT = 'b2b:workspace-changed'

export const WORKSPACE = Object.freeze({
  BUYER: 'buyer',
  SELLER: 'seller',
})

export function readStoredWorkspace() {
  try {
    const value = localStorage.getItem(WORKSPACE_STORAGE_KEY)
    if (value === WORKSPACE.BUYER || value === WORKSPACE.SELLER) return value
  } catch {
    /* storage may be unavailable */
  }
  return null
}

export function persistWorkspace(workspace) {
  if (workspace !== WORKSPACE.BUYER && workspace !== WORKSPACE.SELLER) return
  try {
    localStorage.setItem(WORKSPACE_STORAGE_KEY, workspace)
    window.dispatchEvent(new CustomEvent(WORKSPACE_CHANGE_EVENT, { detail: workspace }))
  } catch {
    /* storage may be unavailable */
  }
}

export function workspaceFromPathname(pathname) {
  if (isSellerSection(pathname)) return WORKSPACE.SELLER
  if (isBuyerSection(pathname)) return WORKSPACE.BUYER
  return null
}

/**
 * Resolve the active workspace for navigation chrome.
 * Path-based sections take precedence; neutral routes (/portal/*) use stored preference.
 */
export function resolveActiveWorkspace({ pathname, buyerAccess, sellerAccess }) {
  const fromPath = workspaceFromPathname(pathname)
  if (fromPath === WORKSPACE.BUYER && buyerAccess) {
    persistWorkspace(WORKSPACE.BUYER)
    return WORKSPACE.BUYER
  }
  if (fromPath === WORKSPACE.SELLER && sellerAccess) {
    persistWorkspace(WORKSPACE.SELLER)
    return WORKSPACE.SELLER
  }

  const stored = readStoredWorkspace()
  if (stored === WORKSPACE.BUYER && buyerAccess) return stored
  if (stored === WORKSPACE.SELLER && sellerAccess) return stored

  if (buyerAccess) return WORKSPACE.BUYER
  if (sellerAccess) return WORKSPACE.SELLER
  return null
}
