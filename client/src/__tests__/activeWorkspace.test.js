import { describe, expect, it, beforeEach } from 'vitest'
import {
  WORKSPACE,
  WORKSPACE_STORAGE_KEY,
  persistWorkspace,
  readStoredWorkspace,
  resolveActiveWorkspace,
  workspaceFromPathname,
} from '../utils/activeWorkspace.js'
import { visiblePortalPrimaryNav, portalRoleLabel } from '../utils/portalNav.js'

describe('activeWorkspace', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('derives workspace from pathname', () => {
    expect(workspaceFromPathname('/buyer/dashboard')).toBe(WORKSPACE.BUYER)
    expect(workspaceFromPathname('/products')).toBe(WORKSPACE.BUYER)
    expect(workspaceFromPathname('/seller/products')).toBe(WORKSPACE.SELLER)
    expect(workspaceFromPathname('/portal/profile')).toBeNull()
  })

  it('persists workspace from path and restores on neutral routes', () => {
    resolveActiveWorkspace({
      pathname: '/seller/dashboard',
      buyerAccess: true,
      sellerAccess: true,
    })
    expect(readStoredWorkspace()).toBe(WORKSPACE.SELLER)

    expect(
      resolveActiveWorkspace({
        pathname: '/portal/profile',
        buyerAccess: true,
        sellerAccess: true,
      }),
    ).toBe(WORKSPACE.SELLER)
  })

  it('defaults to buyer when both workspaces are available and nothing stored', () => {
    expect(
      resolveActiveWorkspace({
        pathname: '/portal',
        buyerAccess: true,
        sellerAccess: true,
      }),
    ).toBe(WORKSPACE.BUYER)
  })

  it('dispatches change event when workspace is persisted', () => {
    let detail = null
    window.addEventListener('b2b:workspace-changed', (event) => {
      detail = event.detail
    })
    persistWorkspace(WORKSPACE.SELLER)
    expect(localStorage.getItem(WORKSPACE_STORAGE_KEY)).toBe(WORKSPACE.SELLER)
    expect(detail).toBe(WORKSPACE.SELLER)
  })
})

describe('portalNav workspace filtering', () => {
  it('shows only buyer dashboard for both-plan users in buyer workspace', () => {
    const nav = visiblePortalPrimaryNav('BUYER', {
      hasBuyer: true,
      hasSeller: true,
      activeWorkspace: 'buyer',
    })
    const labels = nav.map((item) => item.label)
    expect(labels).toContain('Buyer Dashboard')
    expect(labels).not.toContain('Seller Dashboard')
    expect(labels).toContain('Profile')
  })

  it('shows only seller dashboard for both-plan users in seller workspace', () => {
    const nav = visiblePortalPrimaryNav('BUYER', {
      hasBuyer: true,
      hasSeller: true,
      activeWorkspace: 'seller',
    })
    const labels = nav.map((item) => item.label)
    expect(labels).toContain('Seller Dashboard')
    expect(labels).not.toContain('Buyer Dashboard')
  })

  it('shows both dashboards when user has only one workspace type each', () => {
    expect(
      visiblePortalPrimaryNav('BUYER', { hasBuyer: true, hasSeller: false }).map((i) => i.label),
    ).toContain('Buyer Dashboard')
    expect(
      visiblePortalPrimaryNav('SELLER', { hasBuyer: false, hasSeller: true }).map((i) => i.label),
    ).toContain('Seller Dashboard')
  })

  it('labels active workspace for both-plan users', () => {
    expect(
      portalRoleLabel('BUYER', {
        hasBuyer: true,
        hasSeller: true,
        activeWorkspace: 'seller',
      }),
    ).toBe('Seller workspace')
    expect(
      portalRoleLabel('BUYER', {
        hasBuyer: true,
        hasSeller: true,
        activeWorkspace: 'buyer',
      }),
    ).toBe('Buyer workspace')
  })
})
