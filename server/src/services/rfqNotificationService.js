'use strict'

/**
 * RFQ notification feed — polling today; WebSocket/SSE can subscribe to the same emitter later.
 */

const RFQ_EVENT_TYPES = {
  RFQ_RECEIVED: 'RFQ_RECEIVED',
  RFQ_CANCELLED: 'RFQ_CANCELLED',
  QUOTE_RECEIVED: 'QUOTE_RECEIVED',
  QUOTE_REVISED: 'QUOTE_REVISED',
  QUOTE_ACCEPTED: 'QUOTE_ACCEPTED',
  QUOTE_NOT_SELECTED: 'QUOTE_NOT_SELECTED',
  BUYER_QUOTATION_ACCEPTED: 'BUYER_QUOTATION_ACCEPTED',
  QUOTE_DECLINED: 'QUOTE_DECLINED',
  QUOTE_REJECTED_BY_BUYER: 'QUOTE_REJECTED_BY_BUYER',
}

/** In-process hooks for future real-time transports. */
const transportSubscribers = new Set()

function subscribeRfqNotifications(handler) {
  transportSubscribers.add(handler)
  return () => transportSubscribers.delete(handler)
}

function broadcastToTransports(event) {
  for (const handler of transportSubscribers) {
    try {
      handler(event)
    } catch {
      // Real-time transport must not break the write path.
    }
  }
}

async function emitRfqNotification(tx, {
  recipientUserId,
  eventType,
  quoteRequestId = null,
  rfqGroupId = null,
  payload = null,
}) {
  const event = await tx.rfqNotificationEvent.create({
    data: {
      recipientUserId,
      quoteRequestId,
      rfqGroupId,
      eventType,
      payload: payload ?? undefined,
    },
  })

  broadcastToTransports(event)
  return event
}

async function emitToMany(tx, recipientUserIds, fields) {
  const unique = [...new Set(recipientUserIds.filter(Boolean))]
  const events = []
  for (const recipientUserId of unique) {
    events.push(await emitRfqNotification(tx, { ...fields, recipientUserId }))
  }
  return events
}

function buildNotificationSummary(event) {
  return {
    id: event.id,
    eventType: event.eventType,
    quoteRequestId: event.quoteRequestId,
    rfqGroupId: event.rfqGroupId,
    payload: event.payload ?? null,
    readAt: event.readAt,
    createdAt: event.createdAt,
  }
}

module.exports = {
  RFQ_EVENT_TYPES,
  subscribeRfqNotifications,
  emitRfqNotification,
  emitToMany,
  buildNotificationSummary,
}
