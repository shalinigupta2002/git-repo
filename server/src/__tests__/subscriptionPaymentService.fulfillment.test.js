'use strict'

jest.mock('../config/database')

const crypto = require('crypto')
const env = require('../config/env.js')
const { prisma } = require('../config/database')
const { fulfillSubscriptionPayment } = require('../services/subscriptionPaymentService.js')

const ORDER_ID = 'order_fulfill_test'
const PAYMENT_ID = 'pay_fulfill_test'

function checkoutSig(orderId, paymentId) {
  return crypto
    .createHmac('sha256', env.razorpayKeySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex')
}

beforeEach(() => {
  prisma.$transaction.mockImplementation(async (fn) => fn(prisma))
  prisma.payment.updateMany.mockResolvedValue({ count: 1 })
})

describe('fulfillSubscriptionPayment capture validation', () => {
  const basePaymentRow = {
    userId: 'user-1',
    status: 'PENDING',
    amountPaise: 999900,
    currency: 'INR',
  }

  const txPaymentRow = {
    id: 'payment-row-1',
    status: 'PENDING',
    plan: 'BUYER_ANNUAL',
    subscriptionId: null,
    amountPaise: 999900,
    currency: 'INR',
  }

  test('allows fulfillment when webhook-reported paise and currency match Payment row', async () => {
    prisma.payment.findUnique
      .mockResolvedValueOnce(basePaymentRow)
      .mockResolvedValueOnce(txPaymentRow)
    prisma.subscription.findFirst.mockResolvedValue(null)
    prisma.subscription.create.mockResolvedValue({
      id: 'sub-1',
      plan: 'BUYER_ANNUAL',
      status: 'ACTIVE',
      startsAt: new Date(),
      expiresAt: null,
    })
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'u@test.com',
      role: 'BUYER',
      companyName: 'Co',
      createdAt: new Date(),
    })
    prisma.user.update.mockResolvedValue({})
    prisma.payment.update.mockResolvedValue({})

    const result = await fulfillSubscriptionPayment({
      razorpayOrderId: ORDER_ID,
      razorpayPaymentId: PAYMENT_ID,
      razorpaySignature: checkoutSig(ORDER_ID, PAYMENT_ID),
      reportedAmountPaise: 999900,
      reportedCurrency: 'INR',
    })

    expect(result.alreadyPaid).toBe(false)
    expect(prisma.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { razorpayOrderId: ORDER_ID, status: 'PENDING' },
        data: expect.objectContaining({ status: 'PAID' }),
      }),
    )
    expect(prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ subscriptionId: 'sub-1' }),
      }),
    )
  })

  test('rejects wrong reported amount before marking PAID', async () => {
    prisma.payment.findUnique
      .mockResolvedValueOnce(basePaymentRow)
      .mockResolvedValueOnce(txPaymentRow)

    await expect(
      fulfillSubscriptionPayment({
        razorpayOrderId: ORDER_ID,
        razorpayPaymentId: PAYMENT_ID,
        razorpaySignature: checkoutSig(ORDER_ID, PAYMENT_ID),
        reportedAmountPaise: 100,
        reportedCurrency: 'INR',
      }),
    ).rejects.toMatchObject({ code: 'PAYMENT_AMOUNT_MISMATCH', statusCode: 400 })

    expect(prisma.subscription.create).not.toHaveBeenCalled()
    expect(prisma.payment.update).not.toHaveBeenCalled()
  })

  test('rejects wrong reported currency before marking PAID', async () => {
    prisma.payment.findUnique
      .mockResolvedValueOnce(basePaymentRow)
      .mockResolvedValueOnce(txPaymentRow)

    await expect(
      fulfillSubscriptionPayment({
        razorpayOrderId: ORDER_ID,
        razorpayPaymentId: PAYMENT_ID,
        razorpaySignature: checkoutSig(ORDER_ID, PAYMENT_ID),
        reportedAmountPaise: 999900,
        reportedCurrency: 'USD',
      }),
    ).rejects.toMatchObject({ code: 'PAYMENT_CURRENCY_MISMATCH', statusCode: 400 })

    expect(prisma.subscription.create).not.toHaveBeenCalled()
  })
})
