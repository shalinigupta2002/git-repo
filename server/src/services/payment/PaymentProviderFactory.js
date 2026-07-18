'use strict'

const DemoPaymentProvider = require('./DemoPaymentProvider.js')
const RazorpayPaymentProvider = require('./RazorpayPaymentProvider.js')

class PaymentProviderFactory {
  static getProvider() {
    const providerType = process.env.PAYMENT_PROVIDER || 'demo'
    if (providerType === 'razorpay') {
      return new RazorpayPaymentProvider()
    }
    return new DemoPaymentProvider()
  }
}

module.exports = PaymentProviderFactory
