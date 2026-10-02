'use strict'

const crypto = require('crypto')
const env = require('../config/env.js')
const { CSRF_COOKIE_NAME } = require('../config/cookies.js')

function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex')
}

function readCsrfCookie(req) {
  return req.cookies?.[CSRF_COOKIE_NAME] || ''
}

function validateCsrf(req) {
  const cookieToken = readCsrfCookie(req)
  const headerToken = req.headers['x-csrf-token'] || req.headers['X-CSRF-Token'] || ''
  if (!cookieToken || !headerToken) return false
  if (cookieToken.length !== headerToken.length) return false
  return crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(String(headerToken)))
}

module.exports = {
  generateCsrfToken,
  readCsrfCookie,
  validateCsrf,
}
