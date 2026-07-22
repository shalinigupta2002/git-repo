/**
 * Production marketplace bootstrap (safe, non-destructive by default).
 *
 * Usage:
 *   npm run db:seed          — upsert login accounts + master catalog only (never deletes data)
 *   npm run db:reset         — purge transactional data, then seed (local / CI)
 *   npm run db:uat-cleanup   — wipe business data only (keeps demo users + subscriptions)
 *   npm run db:ci:setup      — migrate + reset + seed + catalog (CI only)
 *
 * Destructive cleanup requires RESET_DATABASE=true (set automatically by db:reset).
 * Production reset additionally requires ALLOW_PRODUCTION_RESET=true.
 */

require('./seed/index.js')
