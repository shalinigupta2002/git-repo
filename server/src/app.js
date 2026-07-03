/**
 * Express application
 * ──────────────────────────────────────────────────────────────────────────────
 * Two distinct API namespaces are mounted here.  They are intentionally kept
 * separate because they serve different architectural responsibilities:
 *
 *  /api          ← Transactional B2B marketplace (Prisma / public schema)
 *                  Auth-gated, seller-owned products, orders, inventory,
 *                  subscriptions, addresses, admin panel.
 *                  See src/routes/index.js for the full route map.
 *
 *  /api/catalog  ← Browse-only reference catalog (raw pg / catalog schema)
 *                  Public (no auth), pre-seeded products with categories and
 *                  brands, cursor-paginated for infinite scroll.
 *                  See src/routes/catalog.routes.js for the full route map.
 *
 * Middleware order (critical — do NOT reorder):
 *   1. helmet          — security headers
 *   2. cors            — allow-origin + preflight
 *   3. requestLogger   — assigns req.id, logs every request after response
 *   4. metricsMiddleware — records counters + response times for /health
 *   5. express.json    — parse request body
 *   6. cookieParser    — parse cookies (needed for auth)
 *   7. routes          — business logic
 *   8. notFoundHandler — 404 catch-all
 *   9. errorHandler    — structured error responses + structured error logging
 */

const path           = require('path')
const express        = require('express')
const cors           = require('cors')
const helmet         = require('helmet')
const cookieParser   = require('cookie-parser')
const env            = require('./config/env.js')
const corsOptions    = require('./config/cors.js')
const requestLogger  = require('./middleware/requestLogger.js')
const { metricsMiddleware } = require('./middleware/metrics.js')
const routes         = require('./routes/index.js')
const catalogRoutes  = require('./routes/catalog.routes.js')
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler.js')

const app = express()

// Render / other PaaS terminate TLS at the edge — needed for secure cookies.
if (env.isProd || env.useCrossSiteCookies) {
  app.set('trust proxy', 1)
}

// ── Security ──────────────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: env.useCrossSiteCookies
      ? { policy: 'cross-origin' }
      : undefined,
  }),
)
app.options('*', cors(corsOptions))
app.use(cors(corsOptions))

// ── Observability (must come before routes) ───────────────────────────────────
app.use(requestLogger)     // attaches req.id, logs req+res pairs
app.use(metricsMiddleware) // increments counters + records response times

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

// ── Uploaded contact attachments (images / videos) ───────────────────────────
app.use(
  '/api/uploads/contact',
  express.static(path.join(__dirname, '../uploads/contact'), {
    fallthrough: false,
    maxAge: env.isProd ? '7d' : 0,
  }),
)

// ── Route namespaces ──────────────────────────────────────────────────────────
app.use('/api', routes)
app.use('/api/catalog', catalogRoutes)

// ── Error handling ────────────────────────────────────────────────────────────
app.use(notFoundHandler)
app.use(errorHandler)

module.exports = app
