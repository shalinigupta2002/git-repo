const { prisma } = require('../config/database.js')
const { AppError } = require('../utils/AppError.js')
const { asyncHandler } = require('../utils/asyncHandler.js')
const { hashPassword, comparePassword } = require('../utils/password.js')
const { signToken } = require('../utils/jwt.js')
const env = require('../config/env.js')
const { COOKIE_NAME } = require('../middleware/authenticate.js')

/**
 * Build the cookie options object.
 * - httpOnly: prevents JavaScript access (XSS mitigation)
 * - secure:   HTTPS-only in production
 * - sameSite: 'lax' allows top-level navigations (e.g. OAuth redirects) while
 *             still blocking CSRF from cross-origin form submissions
 * - maxAge:   matches JWT expiry so both expire together
 */
function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: env.cookieMaxAge,
    path: '/',
  }
}

/** Mint a JWT and write it as an httpOnly cookie. */
function setAuthCookie(res, payload) {
  const token = signToken(payload)
  res.cookie(COOKIE_NAME, token, cookieOptions())
  return token
}

const register = asyncHandler(async (req, res) => {
  const { email, password, role, companyName } = req.body

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    throw new AppError('Email already registered', 409, 'EMAIL_EXISTS')
  }

  const passwordHash = await hashPassword(password)
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role,
      companyName: companyName || null,
    },
    select: {
      id: true,
      email: true,
      role: true,
      companyName: true,
      createdAt: true,
    },
  })

  setAuthCookie(res, { sub: user.id, email: user.email, role: user.role })

  res.status(201).json({
    success: true,
    data: { user },
  })
})

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS')
  }

  const ok = await comparePassword(password, user.passwordHash)
  if (!ok) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS')
  }

  const safeUser = {
    id: user.id,
    email: user.email,
    role: user.role,
    companyName: user.companyName,
    createdAt: user.createdAt,
  }

  setAuthCookie(res, { sub: user.id, email: user.email, role: user.role })

  res.json({
    success: true,
    data: { user: safeUser },
  })
})

const me = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: { user: req.user },
  })
})

/**
 * Clear the auth cookie on the client. This endpoint is intentionally
 * unauthenticated — clearing a cookie for an already-expired session
 * should still succeed so the UI can reach a clean state.
 */
const logout = asyncHandler(async (req, res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: 'lax',
    path: '/',
  })
  res.json({ success: true, data: { message: 'Logged out successfully' } })
})

module.exports = { register, login, me, logout }
