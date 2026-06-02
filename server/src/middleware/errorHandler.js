const { AppError } = require('../utils/AppError.js')
const { Prisma }   = require('@prisma/client')
const env          = require('../config/env.js')
const logger       = require('../config/logger.js')

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err)
  }

  // ── Operational / expected errors ─────────────────────────────────────────
  if (err instanceof AppError) {
    // 4xx errors are the client's fault — log at warn, no stack trace needed
    if (err.statusCode < 500) {
      logger.warn(
        { requestId: req.id, code: err.code, statusCode: err.statusCode },
        err.message,
      )
    } else {
      logger.error(
        { requestId: req.id, code: err.code, statusCode: err.statusCode, err },
        err.message,
      )
    }

    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code:    err.code || 'ERROR',
        ...(err.details ? { details: err.details } : {}),
      },
    })
  }

  // ── Prisma known errors ───────────────────────────────────────────────────
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      logger.warn({ requestId: req.id, prismaCode: err.code, meta: err.meta }, 'Duplicate record')
      return res.status(409).json({
        success: false,
        error: {
          message: 'A record with this value already exists',
          code:    'DUPLICATE',
          meta:    env.isDev ? err.meta : undefined,
        },
      })
    }
    if (err.code === 'P2025') {
      logger.warn({ requestId: req.id, prismaCode: err.code }, 'Record not found (Prisma)')
      return res.status(404).json({
        success: false,
        error: { message: 'Record not found', code: 'NOT_FOUND' },
      })
    }
  }

  // ── Unexpected / programming errors ──────────────────────────────────────
  // Log with full stack trace so it appears in the log aggregator.
  logger.error(
    { requestId: req.id, err },
    'Unhandled internal error',
  )

  const statusCode = err.statusCode || 500
  res.status(statusCode).json({
    success: false,
    error: {
      message: env.isDev ? err.message : 'Internal server error',
      code:    'INTERNAL_ERROR',
      ...(env.isDev && err.stack ? { stack: err.stack } : {}),
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
