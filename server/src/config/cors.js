/**
 * Centralised CORS configuration.
 *
 * Security guarantees:
 *  - Never emits a wildcard `Access-Control-Allow-Origin: *` — this would
 *    break `withCredentials` anyway (browsers refuse credentials + wildcard).
 *  - Requests without an `Origin` header (server-to-server, Postman, curl,
 *    mobile clients) are always allowed — `Origin` is browser-only.
 *  - In development, rejected origins are logged to stderr so engineers can
 *    diagnose proxy/port mismatches quickly.
 *  - In production, misconfigured origins are silently rejected (no leak of
 *    the allowed-list in the error).
 *
 * To add or change allowed origins set CLIENT_URL in the server .env file.
 */

const env = require('./env.js')

/**
 * Express-compatible origin validator.
 *
 * @param {string|undefined} origin - The value of the request `Origin` header.
 * @param {function} callback       - Node-style (err, allow) callback.
 */
function originValidator(origin, callback) {
  // No Origin header → non-browser request; always allow
  if (!origin) return callback(null, true)

  if (env.clientUrls.includes(origin)) {
    return callback(null, true)
  }

  if (env.isDev) {
    console.warn(
      `[CORS] Rejected origin: "${origin}"\n` +
      `       Allowed origins: ${env.clientUrls.join(', ')}\n` +
      `       To allow this origin add it to CLIENT_URL in server/.env`,
    )
  }

  callback(new Error(`CORS policy: origin "${origin}" is not allowed`))
}

/** Ready-to-use options object for cors(). */
module.exports = Object.freeze({
  origin:         originValidator,
  credentials:    true,
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: [],
  /** Cache preflight response for 10 minutes (600 s). */
  maxAge:         600,
})
