const { verifyToken } = require('../utils/jwt.js')
const { AppError } = require('../utils/AppError.js')
const { prisma } = require('../config/database.js')

function extractBearer(req) {
  const h = req.headers.authorization
  if (!h || !h.startsWith('Bearer ')) return null
  return h.slice(7).trim()
}

/** Requires a valid JWT and attaches req.user { id, email, role } */
async function authenticate(req, res, next) {
  try {
    const token = extractBearer(req)
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

/** Optional JWT — sets req.user if valid */
async function optionalAuth(req, res, next) {
  const token = extractBearer(req)
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

module.exports = { authenticate, optionalAuth, authorize, extractBearer }
