'use strict'

const { AppError } = require('../utils/AppError.js')

/** Terminal states — no further transitions allowed. */
const TERMINAL_STATUSES = new Set(['ACCEPTED', 'DECLINED', 'NOT_SELECTED', 'CANCELLED'])

/**
 * Explicit RFQ lifecycle transitions.
 * Seller may revise (RESPONDED → RESPONDED) until buyer acts or deal is created.
 */
const TRANSITIONS = {
  PENDING: {
    seller: ['RESPONDED', 'DECLINED'],
    buyer: ['CANCELLED'],
    admin: ['RESPONDED', 'DECLINED', 'CANCELLED'],
  },
  RESPONDED: {
    seller: ['RESPONDED', 'DECLINED'],
    buyer: ['ACCEPTED', 'DECLINED'],
    admin: ['RESPONDED', 'ACCEPTED', 'DECLINED'],
  },
  ACCEPTED: { seller: [], buyer: [], admin: [] },
  DECLINED: { seller: [], buyer: [], admin: [] },
  NOT_SELECTED: { seller: [], buyer: [], admin: [] },
  CANCELLED: { seller: [], buyer: [], admin: [] },
}

function normalizeActor(role) {
  if (role === 'BUYER' || role === 'SELLER' || role === 'ADMIN') return role.toLowerCase()
  return 'admin'
}

function isTerminalStatus(status) {
  return TERMINAL_STATUSES.has(status)
}

function canTransition(fromStatus, toStatus, actorRole) {
  const actor = normalizeActor(actorRole)
  const allowed = TRANSITIONS[fromStatus]?.[actor] ?? []
  return allowed.includes(toStatus)
}

function assertTransition(fromStatus, toStatus, actorRole) {
  if (isTerminalStatus(fromStatus)) {
    throw new AppError(
      `RFQ is closed (${fromStatus}) and cannot be modified.`,
      409,
      'RFQ_CLOSED',
    )
  }
  if (!canTransition(fromStatus, toStatus, actorRole)) {
    throw new AppError(
      `Invalid RFQ transition from ${fromStatus} to ${toStatus}.`,
      409,
      'INVALID_TRANSITION',
    )
  }
}

function isRevisionTransition(fromStatus, toStatus) {
  return fromStatus === 'RESPONDED' && toStatus === 'RESPONDED'
}

function defaultQuoteValidUntil(days = 30) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date
}

async function findAcceptedQuoteInGroup(tx, rfqGroupId, buyerId) {
  if (!rfqGroupId) return null
  return tx.quoteRequest.findFirst({
    where: { rfqGroupId, buyerId, status: 'ACCEPTED' },
  })
}

async function assertGroupOpenForSellerAction(tx, request) {
  if (!request.rfqGroupId) return
  const accepted = await findAcceptedQuoteInGroup(tx, request.rfqGroupId, request.buyerId)
  if (accepted) {
    throw new AppError(
      'This RFQ group is closed because the buyer accepted another quotation.',
      409,
      'RFQ_GROUP_CLOSED',
    )
  }
}

async function assertGroupOpenForBuyerAction(tx, request) {
  if (!request.rfqGroupId) return
  const accepted = await findAcceptedQuoteInGroup(tx, request.rfqGroupId, request.buyerId)
  if (accepted && accepted.id !== request.id) {
    throw new AppError(
      'Another quotation in this RFQ group is already accepted.',
      409,
      'RFQ_GROUP_CLOSED',
    )
  }
}

module.exports = {
  TERMINAL_STATUSES,
  TRANSITIONS,
  isTerminalStatus,
  canTransition,
  assertTransition,
  isRevisionTransition,
  defaultQuoteValidUntil,
  findAcceptedQuoteInGroup,
  assertGroupOpenForSellerAction,
  assertGroupOpenForBuyerAction,
}
