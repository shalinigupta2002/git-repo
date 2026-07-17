/**
 * Production marketplace bootstrap.
 * Login test accounts + master catalog taxonomy (categories, subcategories, brands).
 * No demo RFQs, orders, or seller products by default.
 *
 * Usage:
 *   npm run db:seed
 *   npm run db:uat-cleanup   — wipe business data only (keeps demo users + subscriptions)
 *   npm run db:ci:setup
 */

require('./seed/index.js')
