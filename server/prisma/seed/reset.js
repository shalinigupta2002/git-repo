/**
 * Destructive reset — purge transactional data, then run bootstrap seed.
 *
 * Usage:
 *   npm run db:reset
 *
 * Production requires ALLOW_PRODUCTION_RESET=true in addition.
 */
process.env.RESET_DATABASE = 'true'

require('./index.js')
