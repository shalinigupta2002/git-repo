'use strict'

const { AppError } = require('../utils/AppError.js')
const { appendDealEvent, DEAL_EVENT_TYPES } = require('./dealEventService.js')

const TERMINAL_STATUSES = new Set(['COMPLETED', 'CANCELLED'])

const TRANSITIONS = {
  QUOTATION_ACCEPTED: ['DEAL_CREATED', 'CANCELLED'],
  DEAL_CREATED: ['PAYMENT_PENDING', 'CANCELLED'],
  PAYMENT_PENDING: ['ACTIVE', 'CANCELLED', 'DISPUTED'],
  ACTIVE: ['COMPLETED', 'CANCELLED', 'DISPUTED'],
  COMPLETED: [],
  CANCELLED: [],
  DISPUTED: ['ACTIVE', 'CANCELLED'],
}

function isTerminalStatus(status) {
  return TERMINAL_STATUSES.has(status)
}

function canTransition(fromStatus, toStatus) {
  const allowed = TRANSITIONS[fromStatus] ?? []
  return allowed.includes(toStatus)
}

function assertTransition(fromStatus, toStatus) {
  if (isTerminalStatus(fromStatus)) {
    throw new AppError(
      `Deal is closed (${fromStatus}) and cannot be modified.`,
      409,
      'DEAL_CLOSED',
    )
  }
  if (!canTransition(fromStatus, toStatus)) {
    throw new AppError(
      `Invalid deal transition from ${fromStatus} to ${toStatus}.`,
      409,
      'INVALID_DEAL_TRANSITION',
    )
  }
}

/**
 * Apply a validated business-state transition and record an audit event.
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 */
async function applyDealTransition(tx, deal, toStatus, actorId = null, note = null) {
  assertTransition(deal.status, toStatus)

  const now = new Date()
  const data = { status: toStatus }

  if (toStatus === 'COMPLETED') data.completedAt = now
  if (toStatus === 'CANCELLED') data.cancelledAt = now
  if (toStatus === 'DISPUTED') data.disputedAt = now

  const updated = await tx.deal.update({
    where: { id: deal.id },
    data,
  })

  await appendDealEvent(tx, {
    dealId: deal.id,
    eventType: DEAL_EVENT_TYPES.STATUS_CHANGED,
    actorId,
    payload: {
      fromStatus: deal.status,
      toStatus,
      note,
    },
  })

  return updated
}

module.exports = {
  TERMINAL_STATUSES,
  TRANSITIONS,
  isTerminalStatus,
  canTransition,
  assertTransition,
  applyDealTransition,
}
