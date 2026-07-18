'use strict'

const { prisma } = require('../config/database.js')

/**
 * Allocate the next readable deal number for the current year (DEAL-YYYY-NNNNNN).
 * Must run inside a transaction when creating deals.
 */
async function allocateDealNumber(client = prisma) {
  const year = new Date().getFullYear()
  const counter = await client.dealNumberCounter.upsert({
    where: { year },
    create: { year, lastValue: 1 },
    update: { lastValue: { increment: 1 } },
  })
  return `DEAL-${year}-${String(counter.lastValue).padStart(6, '0')}`
}

module.exports = { allocateDealNumber }
