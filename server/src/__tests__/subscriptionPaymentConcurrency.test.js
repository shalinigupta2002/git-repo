'use strict'

const crypto = require('crypto')
const env = require('../config/env.js')
const { createStatefulPaymentStore } = require('./helpers/statefulPaymentStore.js')
const { IDS } = require('./helpers')

const USER_ID = IDS.BUYER
const ORDER_ID = 'rzp_order_concurrency_1'
const PAYMENT_ID = 'pay_concurrency_1'
const ORDER_B = 'rzp_order_concurrency_b'

function checkoutSig(orderId, paymentId) {
  return crypto
    .createHmac('sha256', env.razorpayKeySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex')
}

function loadFulfillmentService(store) {
  jest.resetModules()
  jest.doMock('../config/database', () => ({ prisma: store.prisma }))
  // eslint-disable-next-line global-require
  return require('../services/subscriptionPaymentService.js')
}

function seedBuyer(store) {
  store.setUser({
    id: USER_ID,
    email: 'buyer@test.com',
    role: 'BUYER',
    companyName: 'Co',
    createdAt: new Date(),
    portalUserId: null,
    buyerSubscriptionStatus: null,
    buyerSubscriptionPlan: null,
    buyerSubscriptionActivatedAt: null,
    sellerSubscriptionStatus: null,
    sellerSubscriptionPlan: null,
    sellerSubscriptionActivatedAt: null,
    isActive: true,
    deactivatedAt: null,
  })
  store.seedPayment({
    userId: USER_ID,
    razorpayOrderId: ORDER_ID,
    plan: 'BUYER_ANNUAL',
    amountPaise: 999900,
    currency: 'INR',
    status: 'PENDING',
  })
}

describe('subscription payment concurrency & idempotency (stateful store)', () => {
  let store
  let fulfillSubscriptionPayment

  beforeEach(() => {
    store = createStatefulPaymentStore()
    seedBuyer(store)
    fulfillSubscriptionPayment = loadFulfillmentService(store).fulfillSubscriptionPayment
  })

  const fulfillArgs = (overrides = {}) => ({
    razorpayOrderId: ORDER_ID,
    razorpayPaymentId: PAYMENT_ID,
    razorpaySignature: checkoutSig(ORDER_ID, PAYMENT_ID),
    reportedAmountPaise: 999900,
    reportedCurrency: 'INR',
    ...overrides,
  })

  test('1 duplicate fulfillment — second call is idempotent, one subscription row', async () => {
    const first = await fulfillSubscriptionPayment(fulfillArgs())
    expect(first.alreadyPaid).toBe(false)

    const second = await fulfillSubscriptionPayment(fulfillArgs())
    expect(second.alreadyPaid).toBe(true)

    const payment = store.getPaymentByOrder(ORDER_ID)
    expect(payment.status).toBe('PAID')
    expect(payment.razorpayPaymentId).toBe(PAYMENT_ID)

    const subs = store.getSubscriptions().filter((s) => s.userId === USER_ID && s.plan === 'BUYER_ANNUAL')
    expect(subs).toHaveLength(1)
  })

  test('2 duplicate payment id on same order — idempotent, single entitlement', async () => {
    await fulfillSubscriptionPayment(fulfillArgs())
    await fulfillSubscriptionPayment(fulfillArgs())

    expect(store.getSubscriptions().filter((s) => s.plan === 'BUYER_ANNUAL')).toHaveLength(1)
    expect(store.getPaymentByOrder(ORDER_ID).status).toBe('PAID')
  })

  test('3 same order, different payment id after first PAID — idempotent, no second grant', async () => {
    await fulfillSubscriptionPayment(fulfillArgs())

    const pay2 = 'pay_concurrency_2'
    const second = await fulfillSubscriptionPayment({
      ...fulfillArgs(),
      razorpayPaymentId: pay2,
      razorpaySignature: checkoutSig(ORDER_ID, pay2),
    })

    expect(second.alreadyPaid).toBe(true)
    expect(store.getSubscriptions().filter((s) => s.plan === 'BUYER_ANNUAL')).toHaveLength(1)
    expect(store.getPaymentByOrder(ORDER_ID).razorpayPaymentId).toBe(PAYMENT_ID)
  })

  test('4 wrong order/payment signature — rejected, payment stays PENDING', async () => {
    store.seedPayment({
      userId: USER_ID,
      razorpayOrderId: ORDER_B,
      plan: 'BUYER_ANNUAL',
      amountPaise: 999900,
      currency: 'INR',
      status: 'PENDING',
    })

    await expect(
      fulfillSubscriptionPayment({
        ...fulfillArgs(),
        razorpayOrderId: ORDER_B,
        razorpaySignature: checkoutSig(ORDER_ID, PAYMENT_ID),
      }),
    ).rejects.toMatchObject({ code: 'INVALID_SIGNATURE' })

    expect(store.getPaymentByOrder(ORDER_ID).status).toBe('PENDING')
    expect(store.getPaymentByOrder(ORDER_B).status).toBe('FAILED')
    expect(store.getSubscriptions()).toHaveLength(0)
  })

  test('5 concurrent fulfillment — at most one grant, final PAID state', async () => {
    const results = await Promise.all([
      fulfillSubscriptionPayment(fulfillArgs()),
      fulfillSubscriptionPayment(fulfillArgs()),
      fulfillSubscriptionPayment(fulfillArgs()),
    ])

    const paidCount = results.filter((r) => r.alreadyPaid === false).length
    const idempotentCount = results.filter((r) => r.alreadyPaid === true).length

    expect(paidCount).toBe(1)
    expect(idempotentCount).toBe(2)

    expect(store.getPaymentByOrder(ORDER_ID).status).toBe('PAID')
    expect(store.getSubscriptions().filter((s) => s.plan === 'BUYER_ANNUAL')).toHaveLength(1)
  })

  test('6 verify + webhook race — single PAID payment and one subscription', async () => {
    const results = await Promise.all([
      fulfillSubscriptionPayment(fulfillArgs()),
      fulfillSubscriptionPayment(fulfillArgs()),
    ])

    expect(results.some((r) => r.alreadyPaid === false)).toBe(true)
    expect(results.every((r) => r.subscriptions.length >= 0)).toBe(true)
    expect(store.getPaymentByOrder(ORDER_ID).status).toBe('PAID')
    expect(store.getSubscriptions().filter((s) => s.plan === 'BUYER_ANNUAL')).toHaveLength(1)
  })

  test('7 webhook retry after success — idempotent without extra grants', async () => {
    await fulfillSubscriptionPayment(fulfillArgs())
    const beforeCount = store.getSubscriptions().length

    const retry = await fulfillSubscriptionPayment(fulfillArgs())
    expect(retry.alreadyPaid).toBe(true)
    expect(store.getSubscriptions().length).toBe(beforeCount)
    expect(store.getPaymentByOrder(ORDER_ID).status).toBe('PAID')
  })

  test('duplicate razorpay payment id across two orders — second order rejected', async () => {
    store.seedPayment({
      userId: USER_ID,
      razorpayOrderId: ORDER_B,
      plan: 'BUYER_ANNUAL',
      amountPaise: 999900,
      currency: 'INR',
      status: 'PENDING',
    })

    await fulfillSubscriptionPayment(fulfillArgs())

    await expect(
      fulfillSubscriptionPayment({
        razorpayOrderId: ORDER_B,
        razorpayPaymentId: PAYMENT_ID,
        razorpaySignature: checkoutSig(ORDER_B, PAYMENT_ID),
        reportedAmountPaise: 999900,
        reportedCurrency: 'INR',
      }),
    ).rejects.toMatchObject({ code: 'PAYMENT_ALREADY_USED' })

    expect(store.getPaymentByOrder(ORDER_B).status).toBe('PENDING')
    expect(store.getSubscriptions().filter((s) => s.plan === 'BUYER_ANNUAL')).toHaveLength(1)
  })
})
