/**
 * Single source of truth for all server-side configuration.
 *
 * Rules:
 *  - Every value is read exactly once, here, and exported as a frozen object.
 *  - `required()` throws immediately if a variable is absent — fail fast.
 *  - `optional()` returns a typed default; never leaks `undefined` to callers.
 *  - Production-only guards run after the base values are resolved so a single
 *    startup crash tells the operator exactly what is missing.
 *  - No code outside this file should read `process.env` directly.
 */

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../../.env') })

// ─── Helpers ─────────────────────────────────────────────────────────────────

function required(name) {
  const v = process.env[name]
  if (v === undefined || String(v).trim() === '') {
    throw new Error(`[config] Missing required environment variable: ${name}`)
  }
  return String(v).trim()
}

function optional(name, defaultValue = '') {
  const v = process.env[name]
  return v && String(v).trim() ? String(v).trim() : defaultValue
}

/**
 * Parse a simple duration string ("7d", "24h", "3600s") into milliseconds.
 * Falls back to 7 days on unrecognised input.
 */
function parseDurationMs(s) {
  const match = String(s || '').match(/^(\d+)([smhd])$/)
  if (!match) return 7 * 24 * 60 * 60 * 1000
  const n = parseInt(match[1], 10)
  const units = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 }
  return n * (units[match[2]] ?? 86_400_000)
}

// ─── Base values ─────────────────────────────────────────────────────────────

const nodeEnv = optional('NODE_ENV', 'development')
const isProd  = nodeEnv === 'production'
const isDev   = !isProd

const jwtExpiresIn = optional('JWT_EXPIRES_IN', '7d')

// ─── CORS / CLIENT_URL ───────────────────────────────────────────────────────
//
// Development: fall back to the standard Vite dev-server ports so engineers
//              can run the app without touching .env at all.
// Production:  CLIENT_URL is mandatory — no wildcard, no localhost fallback.

/** Strip trailing slashes so CORS matches the browser Origin header exactly. */
function normalizeOrigins(list) {
  return list.map((u) => u.replace(/\/+$/, ''))
}

let clientUrls

if (isProd) {
  // Will throw if CLIENT_URL is absent or blank
  const raw = required('CLIENT_URL')
  clientUrls = normalizeOrigins(raw.split(',').map((s) => s.trim()).filter(Boolean))

  if (clientUrls.length === 0) {
    throw new Error('[config] CLIENT_URL must contain at least one origin in production.')
  }

  const hasLocalhost = clientUrls.some((u) => /localhost|127\.0\.0\.1/.test(u))
  if (hasLocalhost) {
    throw new Error(
      '[config] CLIENT_URL must not contain localhost or 127.0.0.1 in production. ' +
      'Provide your real domain(s), e.g. https://app.yourdomain.com',
    )
  }
} else {
  const raw = optional('CLIENT_URL', 'http://localhost:5173,http://localhost:3000')
  clientUrls = normalizeOrigins(raw.split(',').map((s) => s.trim()).filter(Boolean))
}

/**
 * True when the frontend is on a real HTTPS origin (e.g. Vercel), separate from
 * the API host (e.g. Render). Enables SameSite=None + Secure auth cookies.
 */
function detectCrossSiteCookies(urls) {
  return urls.some((origin) => {
    try {
      const { protocol, hostname } = new URL(origin)
      if (protocol !== 'https:') return false
      return !/localhost|127\.0\.0\.1/i.test(hostname)
    } catch {
      return false
    }
  })
}

const useCrossSiteCookies = detectCrossSiteCookies(clientUrls)

if (useCrossSiteCookies && !isProd) {
  console.warn(
    '[config] CLIENT_URL is a production HTTPS origin but NODE_ENV is not "production". ' +
      'Cross-site cookies (SameSite=None) are enabled from CLIENT_URL. Set NODE_ENV=production on Render.',
  )
}

// ─── Razorpay — warn loudly if placeholder keys reach production ─────────────

const razorpayKeyId     = optional('RAZORPAY_KEY_ID')
const razorpayKeySecret = optional('RAZORPAY_KEY_SECRET')

if (isProd) {
  const placeholders = ['', 'rzp_test_REPLACE_ME', 'REPLACE_ME_SECRET']
  if (placeholders.includes(razorpayKeyId) || razorpayKeyId.startsWith('rzp_test_')) {
    console.warn(
      '[config] WARNING: RAZORPAY_KEY_ID is missing or is a test/placeholder key in production.',
    )
  }
  if (placeholders.includes(razorpayKeySecret)) {
    console.warn(
      '[config] WARNING: RAZORPAY_KEY_SECRET is missing or is a placeholder in production.',
    )
  }
}

// ─── Exported config (frozen — callers must not mutate) ─────────────────────

/** Dummy deal payments are allowed only outside production (dev/test/CI) unless overridden by environment. */
const allowDummyDealPayments = optional('ALLOW_DUMMY_DEAL_PAYMENTS', isProd ? 'false' : 'true') === 'true'

module.exports = Object.freeze({
  nodeEnv,
  isProd,
  isDev,
  port:          parseInt(optional('PORT', '3001'), 10),
  databaseUrl:   required('DATABASE_URL'),
  jwtSecret:     required('JWT_SECRET'),
  jwtExpiresIn,
  cookieMaxAge:  parseDurationMs(jwtExpiresIn),
  clientUrls,
  useCrossSiteCookies,
  razorpayKeyId,
  razorpayKeySecret,
  mainPortalProfileEnabled: optional('MAIN_PORTAL_PROFILE_ENABLED', 'false') === 'true',
  allowDummyDealPayments,
})

