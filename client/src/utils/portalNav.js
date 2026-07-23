import { hasActiveBuyerSubscription, isBuyerFreePath } from './buyerSubscription.js'
import {
  hasActiveSellerSubscription,
  isSellerFreePath,
} from './sellerSubscription.js'

export const PORTAL_HOME = '/portal'
export const BUYER_DASHBOARD_PATH = '/buyer/dashboard'
export const SELLER_DASHBOARD_PATH = '/seller/dashboard'

/** Top-level portal sidebar (always visible when signed in). */
export const PORTAL_PRIMARY_NAV = Object.freeze([
  { to: '/portal/profile', label: 'Profile', end: true },
  { to: BUYER_DASHBOARD_PATH, label: 'Buyer Dashboard', section: 'buyer', roles: ['BUYER'] },
  { to: SELLER_DASHBOARD_PATH, label: 'Seller Dashboard', section: 'seller', roles: ['SELLER'] },
  { to: '/portal/contact-admin', label: 'Contact Admin' },
])

export function canAccessBuyerWorkspace(role, hasBuyer = hasActiveBuyerSubscription()) {
  if (role === 'ADMIN') return true
  return Boolean(hasBuyer)
}

export function canAccessSellerWorkspace(role, hasSeller = hasActiveSellerSubscription()) {
  if (role === 'ADMIN') return true
  return Boolean(hasSeller)
}

/** Navbar / marketing dashboard destinations from role + active subscriptions. */
export function dashboardNavOptions({
  role,
  hasBuyer = hasActiveBuyerSubscription(),
  hasSeller = hasActiveSellerSubscription(),
} = {}) {
  const options = []
  if (canAccessBuyerWorkspace(role, hasBuyer)) {
    options.push({ to: BUYER_DASHBOARD_PATH, label: 'Buyer Dashboard', workspace: 'buyer' })
  }
  if (canAccessSellerWorkspace(role, hasSeller)) {
    options.push({ to: SELLER_DASHBOARD_PATH, label: 'Seller Dashboard', workspace: 'seller' })
  }
  return options
}

/**
 * Marketing header menu — always lists buyer + seller dashboards for marketplace
 * accounts. Locked entries route to pricing until that side is subscribed.
 */
export function marketingDashboardMenuOptions({
  role,
  hasBuyer = hasActiveBuyerSubscription(),
  hasSeller = hasActiveSellerSubscription(),
} = {}) {
  if (role === 'ADMIN') {
    return [{ to: '/admin', label: 'Admin Dashboard', locked: false }]
  }

  if (role !== 'BUYER' && role !== 'SELLER') {
    return dashboardNavOptions({ role, hasBuyer, hasSeller }).map((item) => ({
      ...item,
      locked: false,
    }))
  }

  const buyerAccess = canAccessBuyerWorkspace(role, hasBuyer)
  const sellerAccess = canAccessSellerWorkspace(role, hasSeller)

  return [
    {
      to: buyerAccess ? BUYER_DASHBOARD_PATH : '/pricing',
      label: 'Buyer Dashboard',
      locked: !buyerAccess,
      workspace: 'buyer',
    },
    {
      to: sellerAccess ? SELLER_DASHBOARD_PATH : '/pricing',
      label: 'Seller Dashboard',
      locked: !sellerAccess,
      workspace: 'seller',
    },
  ]
}

/** Sidebar links visible for role, subscription access, and active workspace. */
export function visiblePortalPrimaryNav(
  role,
  {
    hasBuyer = hasActiveBuyerSubscription(),
    hasSeller = hasActiveSellerSubscription(),
    activeWorkspace = null,
  } = {},
) {
  const buyerAccess = canAccessBuyerWorkspace(role, hasBuyer)
  const sellerAccess = canAccessSellerWorkspace(role, hasSeller)
  const bothWorkspaces = buyerAccess && sellerAccess

  return PORTAL_PRIMARY_NAV.filter((item) => {
    if (!item.roles?.length) return true
    if (item.section === 'buyer') {
      if (!buyerAccess) return false
      if (bothWorkspaces) return activeWorkspace === 'buyer'
      return true
    }
    if (item.section === 'seller') {
      if (!sellerAccess) return false
      if (bothWorkspaces) return activeWorkspace === 'seller'
      return true
    }
    return item.roles.includes(role)
  })
}

export function portalRoleLabel(
  role,
  {
    hasBuyer = hasActiveBuyerSubscription(),
    hasSeller = hasActiveSellerSubscription(),
    activeWorkspace = null,
  } = {},
) {
  const buyerAccess = canAccessBuyerWorkspace(role, hasBuyer)
  const sellerAccess = canAccessSellerWorkspace(role, hasSeller)
  if (buyerAccess && sellerAccess) {
    return activeWorkspace === 'seller' ? 'Seller workspace' : 'Buyer workspace'
  }
  if (sellerAccess) return 'Seller workspace'
  if (buyerAccess) return 'Buyer workspace'
  return 'Account'
}

export function roleDashboardPath(role) {
  if (role === 'BUYER') return BUYER_DASHBOARD_PATH
  if (role === 'SELLER') return SELLER_DASHBOARD_PATH
  return PORTAL_HOME
}

export function primaryDashboardPath({
  role,
  hasBuyer = hasActiveBuyerSubscription(),
  hasSeller = hasActiveSellerSubscription(),
} = {}) {
  const options = dashboardNavOptions({ role, hasBuyer, hasSeller })
  return options[0]?.to ?? PORTAL_HOME
}

export function isPathAllowedForUser(
  user,
  path,
  { hasBuyer = hasActiveBuyerSubscription(), hasSeller = hasActiveSellerSubscription() } = {},
) {
  if (!path || typeof path !== 'string') return false
  const role = user?.role
  if (role === 'ADMIN') return path.startsWith('/admin')
  if (path.startsWith('/buyer') || path === '/wishlist') {
    return canAccessBuyerWorkspace(role, hasBuyer)
  }
  if (path.startsWith('/seller')) {
    return canAccessSellerWorkspace(role, hasSeller)
  }
  return (
    path.startsWith('/portal') ||
    path.startsWith('/subscribe') ||
    path.startsWith('/products') ||
    path === '/pricing'
  )
}

/** Nested links under Buyer Dashboard — premium items show as locked when unsubscribed. */
export function visibleBuyerSubNav(hasSub = hasActiveBuyerSubscription()) {
  const items = [
    { to: '/buyer/dashboard', label: 'Dashboard', end: true },
    { to: '/products', label: 'Products' },
    { to: '/buyer/quotations', label: 'RFQs & Quotations', end: true },
    { to: '/buyer/deals', label: 'My Orders' },
    { to: '/buyer/transactions', label: 'Transactions' },
  ]

  return items.map((item) => ({
    ...item,
    locked: !hasSub && !isBuyerFreePath(item.to),
  }))
}

/** Nested links under Seller Dashboard — premium items show as locked when unsubscribed. */
export function visibleSellerSubNav(hasSub = hasActiveSellerSubscription()) {
  const items = [
    { to: '/seller/dashboard', label: 'Overview', end: true },
    { to: '/seller/products', label: 'Listed products' },
    { to: '/seller/add-product', label: 'Add product' },
    { to: '/seller/manage-buyer', label: 'Buyers history' },
    { to: '/seller/quotations', label: 'RFQs & quotations' },
    { to: '/seller/deals', label: 'My deals' },
    { to: '/seller/transactions', label: 'Transactions' },
    { to: '/seller/category-request', label: 'Request category' },
  ]

  return items.map((item) => ({
    ...item,
    locked: !hasSub && !isSellerFreePath(item.to),
  }))
}

export function isBuyerSection(pathname) {
  return pathname.startsWith('/buyer') || pathname === '/products' || pathname === '/wishlist'
}

export function isSellerSection(pathname) {
  return pathname.startsWith('/seller')
}
