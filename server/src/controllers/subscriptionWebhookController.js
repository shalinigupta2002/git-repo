'use strict'

const crypto = require('crypto')
const { asyncHandler } = require('../utils/asyncHandler.js')
const { AppError } = require('../utils/AppError.js')
const env = require('../config/env.js')
const logger = require('../config/logger.js')
const {
  verifyWebhookSignature,
  fulfillSubscriptionPayment,
} = require('../services/subscriptionPaymentService.js')

const HANDLED_EVENTS = new Set(['payment.captured', 'order.paid'])

/**
 * POST /api/subscriptions/webhook
 * Raw body required — mounted in app.js before express.json().
 */
const handleRazorpayWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature']
  const rawBody = req.body
  const bodyString = Buffer.isBuffer(rawBody)
    ? rawBody.toString('utf8')
    : typeof rawBody === 'string'
      ? rawBody
      : rawBody && typeof rawBody === 'object'
        ? JSON.stringify(rawBody)
        : ''

  if (!verifyWebhookSignature(bodyString, signature)) {
    logger.warn({ requestId: req.id }, '[webhook] Invalid Razorpay signature')
    throw new AppError('Invalid webhook signature', 400, 'INVALID_WEBHOOK_SIGNATURE')
  }

  let payload
  try {
    payload = JSON.parse(bodyString)
  } catch {
    throw new AppError('Invalid webhook JSON', 400, 'VALIDATION_ERROR')
  }

  const event = payload?.event
  if (!HANDLED_EVENTS.has(event)) {
    return res.json({ success: true, data: { ignored: true, event } })
  }

  const paymentEntity =
    payload?.payload?.payment?.entity ||
    payload?.payload?.order?.entity?.payments?.[0] ||
    null

  const razorpayOrderId =
    paymentEntity?.order_id ||
    payload?.payload?.order?.entity?.id ||
    null
  const razorpayPaymentId = paymentEntity?.id || null

  if (!razorpayOrderId || !razorpayPaymentId) {
    logger.warn({ event, requestId: req.id }, '[webhook] Missing order/payment ids')
    return res.json({ success: true, data: { ignored: true, reason: 'missing_ids' } })
  }

  const checkoutSignature = crypto
    .createHmac('sha256', env.razorpayKeySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex')

  const reportedAmountPaise =
    paymentEntity?.amount ??
    payload?.payload?.order?.entity?.amount ??
    null
  const reportedCurrency =
    paymentEntity?.currency ??
    payload?.payload?.order?.entity?.currency ??
    null

  try {
    const result = await fulfillSubscriptionPayment({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature: checkoutSignature,
      reportedAmountPaise,
      reportedCurrency,
    })

    logger.info(
      { razorpayOrderId, alreadyPaid: result.alreadyPaid, requestId: req.id },
      '[webhook] Subscription payment fulfilled',
    )

    return res.json({
      success: true,
      data: {
        processed: true,
        alreadyPaid: Boolean(result.alreadyPaid),
      },
    })
  } catch (err) {
    if (err instanceof AppError && err.code === 'NOT_FOUND') {
      return res.json({ success: true, data: { ignored: true, reason: 'payment_not_found' } })
    }
    throw err
  }
})

module.exports = { handleRazorpayWebhook }
