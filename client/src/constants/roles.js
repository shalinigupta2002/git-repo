/**
 * Application user roles. Use these constants in route guards,
 * role checks, and selectors instead of string literals.
 */
export const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  BUYER: 'BUYER',
  SELLER: 'SELLER',
})

export const BUYER_ACCESS_ROLES = [ROLES.BUYER, ROLES.ADMIN]
export const SELLER_ACCESS_ROLES = [ROLES.SELLER, ROLES.ADMIN]
export const ADMIN_ONLY_ROLES = [ROLES.ADMIN]
