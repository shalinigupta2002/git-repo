import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { useAppSelector } from '../hooks/redux.js'
import { selectHasBuyerSubscription, selectHasSellerSubscription } from '../store/slices/subscriptionSlice.js'
import { PageLoader } from '../components/ui/PageLoader.jsx'
import {
  PORTAL_HOME,
  SELLER_DASHBOARD_PATH,
  canAccessBuyerWorkspace,
  canAccessSellerWorkspace,
  primaryDashboardPath,
  roleDashboardPath,
} from '../utils/portalNav.js'
import { hasActiveBuyerSubscription } from '../utils/buyerSubscription.js'
import {
  hasActiveSellerSubscription,
} from '../utils/sellerSubscription.js'
import { setIntendedRoute } from '../utils/authStorage.js'

/**
 * Resolve the landing path for a role — used after guest redirects.
 */
function dashboardForRole(role) {
  if (role === 'ADMIN') return '/admin'
  return roleDashboardPath(role) || PORTAL_HOME
}

function checkSubscription(kind) {
  if (kind === 'buyer') return hasActiveBuyerSubscription()
  if (kind === 'seller') return hasActiveSellerSubscription()
  return true
}

/**
 * Single, composable route guard. Replaces per-concern guards.
 *
 * Props:
 *   - requireAuth (boolean, default true): block unauthenticated users.
 *   - roles (string[] | undefined): require the user's role to be in this list.
 *   - subscription ('buyer' | 'seller' | undefined): require an active plan.
 *   - guestOnly (boolean): if true, redirect already-authenticated users to
 *     their dashboard (used for /login, /register).
 *   - redirectTo (string): override the fallback redirect path for the
 *     unauthenticated case (e.g. send admin pages to `/admin/login`).
 *   - children: the protected tree.
 *
 * Behaviour:
 *   - Unauthenticated → redirect to `/login` (or `redirectTo`) and remember
 *     the intended destination so post-login redirect works.
 *   - Wrong role / missing subscription → redirect to `/unauthorized`.
 */
export function ProtectedRoute({
  children,
  requireAuth = true,
  roles,
  workspace,
  subscription,
  guestOnly = false,
  redirectTo,
}) {
  const location = useLocation()
  const { user, initialized, isAuthenticated } = useAuth()
  const hasBuyerSub = useAppSelector(selectHasBuyerSubscription)
  const hasSellerSub = useAppSelector(selectHasSellerSubscription)

  if (!initialized) {
    return <PageLoader label="Loading session" />
  }

  if (guestOnly) {
    if (isAuthenticated && user) {
      return <Navigate to={redirectTo || dashboardForRole(user.role)} replace />
    }
    return children
  }

  if (requireAuth && !isAuthenticated) {
    const intended = `${location.pathname}${location.search || ''}${location.hash || ''}`
    setIntendedRoute(intended)
    return (
      <Navigate
        to={redirectTo || '/login'}
        state={{ from: { pathname: intended } }}
        replace
      />
    )
  }

  if (workspace === 'buyer' && user && !canAccessBuyerWorkspace(user.role, hasBuyerSub)) {
    return <Navigate to="/unauthorized" replace state={{ from: location }} />
  }

  if (workspace === 'seller' && user && !canAccessSellerWorkspace(user.role, hasSellerSub)) {
    return <Navigate to="/unauthorized" replace state={{ from: location }} />
  }

  if (roles?.length && user && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace state={{ from: location }} />
  }

  if (subscription && !checkSubscription(subscription)) {
    if (subscription === 'seller' && canAccessSellerWorkspace(user?.role, hasSellerSub)) {
      return (
        <Navigate
          to={SELLER_DASHBOARD_PATH}
          replace
          state={{ from: location, reason: 'subscription', showSubscribeAlert: true }}
        />
      )
    }
    if (subscription === 'buyer' && canAccessBuyerWorkspace(user?.role, hasBuyerSub)) {
      return (
        <Navigate
          to="/pricing"
          replace
          state={{ from: location, reason: 'subscription' }}
        />
      )
    }
    return (
      <Navigate
        to={primaryDashboardPath({ role: user?.role, hasBuyer: hasBuyerSub, hasSeller: hasSellerSub }) || PORTAL_HOME}
        replace
        state={{ from: location, reason: 'subscription' }}
      />
    )
  }

  return children
}
