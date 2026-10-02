'use strict'

const env = require('../config/env.js')
const { AppError } = require('../utils/AppError.js')

/**
 * Blocks POST /auth/register when public self-service signup is disabled.
 * Policy is controlled by ENABLE_PUBLIC_REGISTRATION (see env.js).
 */
function requirePublicRegistration(req, res, next) {
  if (env.enablePublicRegistration) {
    return next()
  }

  return next(
    new AppError(
      'Public registration is not available. Sign in with an existing account or contact support.',
      403,
      'REGISTRATION_DISABLED',
    ),
  )
}

module.exports = { requirePublicRegistration }
