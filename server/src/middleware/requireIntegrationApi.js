const env = require('../config/env.js')
const { AppError } = require('../utils/AppError.js')

/**
 * Integration routes are disabled in production unless INTEGRATION_API_ENABLED=true.
 * Prevents accidental exposure of portal integration surfaces before S2S hardening is complete.
 */
function requireIntegrationApi(req, res, next) {
  if (env.integrationApiEnabled) return next()
  return next(
    new AppError(
      'Integration API is disabled. Set INTEGRATION_API_ENABLED=true when portal integration is ready.',
      404,
      'INTEGRATION_DISABLED',
    ),
  )
}

module.exports = { requireIntegrationApi }
