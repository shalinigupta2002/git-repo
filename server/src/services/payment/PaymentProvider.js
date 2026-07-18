'use strict'

/**
 * Base payment provider interface.
 */
class PaymentProvider {
  /**
   * Check if this provider is currently available for processing payments.
   * @returns {boolean}
   */
  isAvailable() {
    return true
  }

  /**
   * Process a platform charge payment.
   * @param {import('@prisma/client').Prisma.TransactionClient} tx
   * @param {object} params
   * @param {string} params.dealId
   * @param {'BUYER'|'SELLER'} params.payerRole
   * @param {string} params.actorUserId
   * @returns {Promise<object>} The updated deal record
   */
  async processPayment(tx, { dealId, payerRole, actorUserId }) {
    throw new Error('processPayment must be implemented by subclasses.')
  }
}

module.exports = PaymentProvider
