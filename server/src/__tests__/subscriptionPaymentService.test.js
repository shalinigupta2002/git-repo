'use strict'

const crypto = require('crypto')
const env = require('../config/env.js')
const {
  verifyWebhookSignature,
  verifyCheckoutSignature,
} = require('../services/subscriptionPaymentService.js')

describe('subscriptionPaymentService signatures', () => {
  test('verifyWebhookSignature validates HMAC of raw body', () => {
    const body = '{"event":"payment.captured"}'
    const sig = crypto
      .createHmac('sha256', env.razorpayWebhookSecret)
      .update(body)
      .digest('hex')

    expect(verifyWebhookSignature(body, sig)).toBe(true)
    expect(verifyWebhookSignature(body, 'bad-signature')).toBe(false)
  })

  test('verifyCheckoutSignature validates order|payment signature', () => {
    const orderId = 'order_abc'
    const paymentId = 'pay_xyz'
    const sig = crypto
      .createHmac('sha256', env.razorpayKeySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex')

    expect(verifyCheckoutSignature(orderId, paymentId, sig)).toBe(true)
    expect(verifyCheckoutSignature(orderId, paymentId, 'nope')).toBe(false)
  })
})
