import { PORTAL_HOME, roleDashboardPath } from './portalNav.js'

/** Landing path for the signed-in user's role (marketing nav → dashboard). */
export function dashboardPathForRole(role) {
  if (role === 'ADMIN') return '/admin'
  if (role === 'BUYER' || role === 'SELLER') return roleDashboardPath(role)
  return PORTAL_HOME
}
