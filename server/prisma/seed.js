/**
 * Production marketplace bootstrap.
 * Login test accounts + master catalog taxonomy (categories, subcategories, brands).
 * No demo products, RFQs, orders, subscriptions, or payments.
 *
 * Usage:
 *   npm run db:seed
 *   npm run db:ci:setup
 */

require('./seed/index.js')
