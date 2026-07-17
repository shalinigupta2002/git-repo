'use strict'

const { Prisma } = require('@prisma/client')

function serializeRevision(row) {
  if (!row) return row
  return {
    id: row.id,
    revisionNumber: row.revisionNumber,
    sellerUnitPrice: row.sellerUnitPrice?.toString?.() ?? row.sellerUnitPrice,
    sellerCurrency: row.sellerCurrency,
    taxNote: row.taxNote,
    quoteValidUntil: row.quoteValidUntil,
    freightNote: row.freightNote,
    exclusionsNote: row.exclusionsNote,
    createdById: row.createdById,
    createdAt: row.createdAt,
  }
}

/**
 * Record a quotation revision snapshot after seller respond/revise.
 */
async function recordQuoteRevision(tx, quoteRequestId, sellerId, quoteFields) {
  const existingCount = await tx.quoteRevision.count({ where: { quoteRequestId } })
  const revisionNumber = existingCount + 1

  const revision = await tx.quoteRevision.create({
    data: {
      quoteRequestId,
      revisionNumber,
      sellerUnitPrice: new Prisma.Decimal(String(quoteFields.sellerUnitPrice)),
      sellerCurrency: quoteFields.sellerCurrency || 'INR',
      taxNote: quoteFields.taxNote ?? null,
      quoteValidUntil: quoteFields.quoteValidUntil ?? null,
      freightNote: quoteFields.freightNote ?? null,
      exclusionsNote: quoteFields.exclusionsNote ?? null,
      createdById: sellerId,
    },
  })

  await tx.quoteRequest.update({
    where: { id: quoteRequestId },
    data: { revisionCount: revisionNumber },
  })

  return revision
}

async function listQuoteRevisions(txOrPrisma, quoteRequestId) {
  const rows = await txOrPrisma.quoteRevision.findMany({
    where: { quoteRequestId },
    orderBy: { revisionNumber: 'asc' },
  })
  return rows.map(serializeRevision)
}

module.exports = {
  serializeRevision,
  recordQuoteRevision,
  listQuoteRevisions,
}
