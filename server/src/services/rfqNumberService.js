'use strict'

const { prisma } = require('../config/database.js')

/**
 * Allocate the next readable RFQ number for the current year (RFQ-YYYY-NNNNNN).
 * Must run inside a transaction when creating RFQ groups.
 */
async function allocateRfqNumber(client = prisma) {
  const year = new Date().getFullYear()
  const counter = await client.rfqNumberCounter.upsert({
    where: { year },
    create: { year, lastValue: 1 },
    update: { lastValue: { increment: 1 } },
  })
  return `RFQ-${year}-${String(counter.lastValue).padStart(6, '0')}`
}

module.exports = { allocateRfqNumber }
