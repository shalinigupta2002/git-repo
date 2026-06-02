const { PrismaClient } = require('@prisma/client')
const env    = require('./env.js')
const logger = require('./logger.js')

const prisma = new PrismaClient({
  // Emit as events so we can route them through pino instead of stdout
  log: [
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn'  },
    ...(env.isDev ? [{ emit: 'event', level: 'query' }] : []),
  ],
})

// Route Prisma log events through the structured logger
prisma.$on('error', (e) => {
  logger.error({ target: e.target, message: e.message }, 'Prisma error')
})

prisma.$on('warn', (e) => {
  logger.warn({ message: e.message }, 'Prisma warning')
})

if (env.isDev) {
  prisma.$on('query', (e) => {
    logger.debug(
      { query: e.query, params: e.params, durationMs: e.duration },
      'Prisma query',
    )
  })
}

module.exports = { prisma }
