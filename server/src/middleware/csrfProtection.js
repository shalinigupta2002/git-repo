'use strict'

const env = require('../config/env.js')
const { AppError } = require('../utils/AppError.js')
const { validateCsrf } = require('../utils/csrf.js')
const { COOKIE_NAME } = require('../config/cookies.js')

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

const EXEMPT_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/subscriptions/webhook',
  '/api/health',
]

function csrfProtection(req, res, next) {
  if (!env.csrfProtectionEnabled) return next()
  if (SAFE_METHODS.has(req.method)) return next()

  const path = (req.originalUrl || req.url || '').split('?')[0]
  if (EXEMPT_PATHS.some((exempt) => path === exempt || path.endsWith(exempt))) {
    return next()
  }

  // Let authenticate() return 401 for guests — CSRF only applies to cookie sessions.
  if (!req.cookies?.[COOKIE_NAME]) {
    return next()
  }

  if (!validateCsrf(req)) {
    return next(new AppError('Invalid or missing CSRF token', 403, 'CSRF_VALIDATION_FAILED'))
  }

  return next()
}

module.exports = { csrfProtection }
