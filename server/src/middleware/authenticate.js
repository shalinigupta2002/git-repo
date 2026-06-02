const { verifyToken } = require('../utils/jwt.js')
const { AppError } = require('../utils/AppError.js')
const { prisma } = require('../config/database.js')

const COOKIE_NAME = 'auth_token'

/**
 * Extract the JWT from the httpOnly cookie set by the auth endpoints.
 * Falls back to the Authorization: Bearer header so existing API clients
 * (Postman, mobile apps, tests) keep working during migration.
 */
function extractToken(req) {
  if (req.cookies?.[COOKIE_NAME]) return req.cookies[COOKIE_NAME]
  const h = req.headers.authorization
  if (h && h.startsWith('Bearer ')) return h.slice(7).trim()
  return null
}

/** Requires a valid JWT and attaches req.user { id, email, role, companyName } */
async function authenticate(req, res, next) {
  try {
    const token = extractToken(req)
    if (!token) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED')
    }
    const decoded = verifyToken(token)
    const userId = decoded.sub
    if (!userId) {
      throw new AppError('Invalid token', 401, 'INVALID_TOKEN')
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, companyName: true },
    })
    if (!user) {
      throw new AppError('User no longer exists', 401, 'USER_NOT_FOUND')
    }
    req.user = user
    next()
  } catch (err) {
    if (err instanceof AppError) return next(err)
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(new AppError('Invalid or expired token', 401, 'INVALID_TOKEN'))
    }
    next(err)
  }
}

/** Optional JWT — sets req.user if valid, continues regardless */
async function optionalAuth(req, res, next) {
  const token = extractToken(req)
  if (!token) return next()
  try {
    const decoded = verifyToken(token)
    const userId = decoded.sub
    if (!userId) return next()
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, companyName: true },
    })
    if (user) req.user = user
  } catch {
    /* ignore invalid optional token */
  }
  next()
}

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'))
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('Forbidden', 403, 'FORBIDDEN'))
    }
    next()
  }
}

module.exports = { authenticate, optionalAuth, authorize, COOKIE_NAME }
