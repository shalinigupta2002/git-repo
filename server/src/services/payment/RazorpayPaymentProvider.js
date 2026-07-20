'use strict'

const PaymentProvider = require('./PaymentProvider.js')
const { AppError } = require('../../utils/AppError.js')
const { isRazorpayDealPaymentsAvailable } = require('./dealRazorpayService.js')

class RazorpayPaymentProvider extends PaymentProvider {
  isAvailable() {
    return isRazorpayDealPaymentsAvailable()
  }

  async processPayment() {
    throw new AppError(
      'Use POST /pay/order and POST /pay/verify for Razorpay deal charge payments.',
      400,
      'USE_RAZORPAY_CHECKOUT',
    )
  }
}

module.exports = RazorpayPaymentProvider
