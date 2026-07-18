'use strict'

const PaymentProvider = require('./PaymentProvider.js')
const { AppError } = require('../../utils/AppError.js')

class RazorpayPaymentProvider extends PaymentProvider {
  isAvailable() {
    // Razorpay provider is not available yet (requires credential config / keys).
    return false
  }

  async processPayment(tx, { dealId, payerRole, actorUserId }) {
    // Structural support for future Razorpay integration.
    throw new AppError(
      'Razorpay deal payments are not available. Configure a production payment provider.',
      503,
      'PAYMENT_PROVIDER_UNAVAILABLE',
    )
  }
}

module.exports = RazorpayPaymentProvider
