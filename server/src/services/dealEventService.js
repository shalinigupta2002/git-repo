'use strict'

const DEAL_EVENT_TYPES = Object.freeze({
  DEAL_CREATED: 'DEAL_CREATED',
  CHARGE_CALCULATED: 'CHARGE_CALCULATED',
  PAYMENT_CREATED: 'PAYMENT_CREATED',
  PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  STATUS_CHANGED: 'STATUS_CHANGED',
  CONTACT_UNLOCKED: 'CONTACT_UNLOCKED',
  DEAL_COMPLETED: 'DEAL_COMPLETED',
  ADMIN_OVERRIDE: 'ADMIN_OVERRIDE',
})

/**
 * Append-only deal audit event. Never update existing rows.
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 */
async function appendDealEvent(tx, { dealId, eventType, actorId = null, payload = null }) {
  return tx.dealEvent.create({
    data: {
      dealId,
      eventType,
      actorId,
      payload: payload ?? undefined,
    },
  })
}

module.exports = {
  DEAL_EVENT_TYPES,
  appendDealEvent,
}
