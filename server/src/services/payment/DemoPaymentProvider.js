'use strict'

const PaymentProvider = require('./PaymentProvider.js')
const { AppError } = require('../../utils/AppError.js')

class DemoPaymentProvider extends PaymentProvider {
  isAvailable() {
    const env = require('../../config/env.js')
    return Boolean(env.allowDummyDealPayments)
  }

  async processPayment(tx, { dealId, payerRole, actorUserId }) {
    const {
      lockDealRow,
      markPaymentSuccessful,
      unlockDealContactIfEligible,
      loadDealForPaymentResponse,
      getPaymentByRole,
    } = require('../dealPaymentService.js')

    await lockDealRow(tx, dealId)

    const deal = await tx.deal.findUnique({
      where: { id: dealId },
      include: { payments: true },
    })

    if (!deal) {
      throw new AppError('Deal not found.', 404, 'DEAL_NOT_FOUND')
    }

    const payment = getPaymentByRole(deal.payments, payerRole)
    if (!payment) {
      throw new AppError('Deal payment record not found.', 404, 'PAYMENT_NOT_FOUND')
    }

    if (payment.payerUserId !== actorUserId) {
      throw new AppError('Forbidden', 403, 'FORBIDDEN')
    }

    if (payment.paymentStatus === 'SUCCESS') {
      return loadDealForPaymentResponse(tx, dealId)
    }

    if (deal.status !== 'PAYMENT_PENDING' && deal.contactUnlockStatus !== 'UNLOCKED') {
      throw new AppError(
        'Deal is not awaiting payment.',
        400,
        'INVALID_PAYMENT_STATE',
      )
    }

    const { recalculatePendingDealCharges } = require('../dealChargeService.js')
    const updatedDeal = await recalculatePendingDealCharges(tx, deal)
    const freshPayment = updatedDeal.payments.find(p => p.id === payment.id) || payment

    await markPaymentSuccessful(tx, freshPayment, actorUserId, 'demo')

    const payments = await tx.dealPayment.findMany({
      where: { dealId: deal.id },
      orderBy: { createdAt: 'asc' },
    })

    const refreshedDeal = await tx.deal.findUnique({
      where: { id: deal.id },
      include: { payments: true },
    })

    await unlockDealContactIfEligible(tx, refreshedDeal, payments, actorUserId)

    return loadDealForPaymentResponse(tx, dealId)
  }
}

module.exports = DemoPaymentProvider
