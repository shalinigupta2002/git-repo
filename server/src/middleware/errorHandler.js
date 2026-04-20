const { AppError } = require('../utils/AppError.js')
const { Prisma } = require('@prisma/client')

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err)
  }

  const isDev = process.env.NODE_ENV === 'development'

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.code || 'ERROR',
        ...(err.details ? { details: err.details } : {}),
      },
    })
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: {
          message: 'A record with this value already exists',
          code: 'DUPLICATE',
          meta: isDev ? err.meta : undefined,
        },
      })
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: { message: 'Record not found', code: 'NOT_FOUND' },
      })
    }
  }

  console.error(err)
  const statusCode = err.statusCode || 500
  res.status(statusCode).json({
    success: false,
    error: {
      message: isDev ? err.message : 'Internal server error',
      code: 'INTERNAL_ERROR',
      ...(isDev && err.stack ? { stack: err.stack } : {}),
    },
  })
}

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: { message: `Cannot ${req.method} ${req.originalUrl}`, code: 'NOT_FOUND' },
  })
}

module.exports = { errorHandler, notFoundHandler }
