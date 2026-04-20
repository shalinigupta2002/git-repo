const jwt = require('jsonwebtoken')
const env = require('../config/env.js')

/**
 * @param {{ sub: string, email: string, role: string }} payload
 */
function signToken(payload) {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
    issuer: 'b2b-ecommerce-api',
  })
}

function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret, { issuer: 'b2b-ecommerce-api' })
}

module.exports = { signToken, verifyToken }
