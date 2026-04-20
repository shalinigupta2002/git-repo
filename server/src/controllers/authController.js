const { prisma } = require('../config/database.js')
const { AppError } = require('../utils/AppError.js')
const { asyncHandler } = require('../utils/asyncHandler.js')
const { hashPassword, comparePassword } = require('../utils/password.js')
const { signToken } = require('../utils/jwt.js')

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

  const token = signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  })

  res.status(201).json({
    success: true,
    data: { user, token },
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

  const token = signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  })

  res.json({
    success: true,
    data: { user: safeUser, token },
  })
})

const me = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: { user: req.user },
  })
})

module.exports = { register, login, me }
