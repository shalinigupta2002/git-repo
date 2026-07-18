'use strict'

jest.mock('../config/env.js', () => ({
  allowDummyDealPayments: true,
  isProd: false,
}))

const { Prisma } = require('@prisma/client')
const {
  markPaymentSuccessful,
  unlockDealContactIfEligible,
  processDummyDealPayment,
  assertDummyPaymentAllowed,
  areBothDealPaymentsSuccessful,
} = require('../services/dealPaymentService.js')

function makePayment(overrides = {}) {
  return {
    id: 'pay-1',
    dealId: 'deal-1',
    payerRole: 'BUYER',
    payerUserId: 'buyer-1',
    paymentReference: 'DPAY-DEAL-2026-000001-BUYER',
    provider: 'dummy',
    paymentStatus: 'PENDING',
    amount: new Prisma.Decimal('90'),
    currency: 'INR',
    ...overrides,
  }
}

function makeDeal(overrides = {}) {
  return {
    id: 'deal-1',
    dealNumber: 'DEAL-2026-000001',
    status: 'PAYMENT_PENDING',
    contactUnlockStatus: 'LOCKED',
    payments: [
      makePayment(),
      makePayment({
        id: 'pay-2',
        payerRole: 'SELLER',
        payerUserId: 'seller-1',
        paymentReference: 'DPAY-DEAL-2026-000001-SELLER',
      }),
    ],
    ...overrides,
  }
}

describe('dealPaymentService', () => {
  describe('markPaymentSuccessful', () => {
    test('is idempotent when payment is already SUCCESS', async () => {
      const payment = makePayment({ paymentStatus: 'SUCCESS' })
      const tx = {
        dealPayment: {
          updateMany: jest.fn(),
          findUnique: jest.fn(),
        },
        dealEvent: { create: jest.fn() },
      }

      const result = await markPaymentSuccessful(tx, payment, 'buyer-1')

      expect(result.updated).toBe(false)
      expect(tx.dealPayment.updateMany).not.toHaveBeenCalled()
      expect(tx.dealEvent.create).not.toHaveBeenCalled()
    })

    test('uses conditional update and appends one success event', async () => {
      const payment = makePayment()
      const tx = {
        dealPayment: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findUnique: jest.fn(),
        },
        dealEvent: { create: jest.fn().mockResolvedValue({ id: 'evt-1' }) },
      }

      const result = await markPaymentSuccessful(tx, payment, 'buyer-1')

      expect(result.updated).toBe(true)
      expect(tx.dealPayment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: payment.id, paymentStatus: 'PENDING' },
        }),
      )
      expect(tx.dealEvent.create).toHaveBeenCalledTimes(1)
    })

    test('does not append duplicate event when conditional update loses race', async () => {
      const payment = makePayment()
      const tx = {
        dealPayment: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          findUnique: jest.fn().mockResolvedValue(makePayment({ paymentStatus: 'SUCCESS' })),
        },
        dealEvent: { create: jest.fn() },
      }

      const result = await markPaymentSuccessful(tx, payment, 'buyer-1')

      expect(result.updated).toBe(false)
      expect(tx.dealEvent.create).not.toHaveBeenCalled()
    })
  })

  describe('unlockDealContactIfEligible', () => {
    test('unlocks exactly once when both payments succeed', async () => {
      const deal = makeDeal({
        payments: [
          makePayment({ paymentStatus: 'SUCCESS' }),
          makePayment({
            id: 'pay-2',
            payerRole: 'SELLER',
            payerUserId: 'seller-1',
            paymentReference: 'DPAY-DEAL-2026-000001-SELLER',
            paymentStatus: 'SUCCESS',
          }),
        ],
      })

      const tx = {
        deal: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findUnique: jest.fn().mockResolvedValue({
            ...deal,
            contactUnlockStatus: 'UNLOCKED',
          }),
          update: jest.fn().mockResolvedValue({
            ...deal,
            status: 'ACTIVE',
          }),
        },
        dealEvent: { create: jest.fn().mockResolvedValue({ id: 'evt-unlock' }) },
      }

      await unlockDealContactIfEligible(tx, deal, deal.payments, 'buyer-1')

      expect(tx.deal.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: deal.id, contactUnlockStatus: 'LOCKED' },
        }),
      )
      expect(tx.dealEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ eventType: 'CONTACT_UNLOCKED' }),
        }),
      )
    })

    test('skips unlock when contact is already UNLOCKED', async () => {
      const deal = makeDeal({ contactUnlockStatus: 'UNLOCKED', status: 'ACTIVE' })
      const tx = {
        deal: {
          updateMany: jest.fn(),
          update: jest.fn(),
        },
        dealEvent: { create: jest.fn() },
      }

      await unlockDealContactIfEligible(tx, deal, deal.payments, 'buyer-1')

      expect(tx.deal.updateMany).not.toHaveBeenCalled()
      expect(tx.dealEvent.create).not.toHaveBeenCalled()
    })

    test('does not append unlock event when updateMany count is zero', async () => {
      const deal = makeDeal({
        payments: [
          makePayment({ paymentStatus: 'SUCCESS' }),
          makePayment({
            id: 'pay-2',
            payerRole: 'SELLER',
            payerUserId: 'seller-1',
            paymentReference: 'DPAY-DEAL-2026-000001-SELLER',
            paymentStatus: 'SUCCESS',
          }),
        ],
      })

      const tx = {
        deal: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          findUnique: jest.fn().mockResolvedValue(deal),
          update: jest.fn().mockResolvedValue({ ...deal, status: 'ACTIVE' }),
        },
        dealEvent: { create: jest.fn().mockResolvedValue({ id: 'evt-unlock' }) },
      }

      await unlockDealContactIfEligible(tx, deal, deal.payments, 'buyer-1')

      expect(tx.dealEvent.create).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ eventType: 'CONTACT_UNLOCKED' }),
        }),
      )
    })
  })

  describe('processDummyDealPayment', () => {
    test('serializes concurrent pay flow under row lock and unlocks once', async () => {
      const deal = makeDeal()
      const unlockedDeal = {
        ...deal,
        status: 'ACTIVE',
        contactUnlockStatus: 'UNLOCKED',
        payments: deal.payments.map((payment) => ({ ...payment, paymentStatus: 'SUCCESS' })),
        buyer: { id: 'buyer-1', portalUserId: 'USR-BUYER', companyName: 'Buyer', email: 'b@test.com', addresses: [{ city: 'Delhi', line1: 'A', phone: '1' }] },
        seller: { id: 'seller-1', portalUserId: 'USR-SELLER', companyName: 'Seller', email: 's@test.com', addresses: [{ city: 'Mumbai', line1: 'B', phone: '2' }] },
        quoteRequest: { id: 'q1', rfqNumber: 'RFQ-1', status: 'ACCEPTED' },
        events: [],
        buyerChargeConfig: null,
        sellerChargeConfig: null,
      }

      const tx = {
        $queryRaw: jest.fn().mockResolvedValue([]),
        deal: {
          findUnique: jest.fn()
            .mockResolvedValueOnce(deal)
            .mockResolvedValueOnce({ ...deal, payments: [makePayment({ paymentStatus: 'SUCCESS' }), deal.payments[1]] })
            .mockResolvedValueOnce(unlockedDeal),
        },
        dealPayment: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findMany: jest.fn().mockResolvedValue([
            makePayment({ paymentStatus: 'SUCCESS' }),
            makePayment({
              id: 'pay-2',
              payerRole: 'SELLER',
              payerUserId: 'seller-1',
              paymentReference: 'DPAY-DEAL-2026-000001-SELLER',
              paymentStatus: 'SUCCESS',
            }),
          ]),
          findUnique: jest.fn(),
        },
        dealEvent: { create: jest.fn().mockResolvedValue({ id: 'evt-1' }) },
      }

      tx.deal.updateMany = jest.fn().mockResolvedValue({ count: 1 })
      tx.deal.update = jest.fn().mockResolvedValue({ ...deal, status: 'ACTIVE' })

      const db = {
        $transaction: jest.fn(async (fn) => fn(tx)),
      }

      const result = await processDummyDealPayment(db, {
        dealId: deal.id,
        payerRole: 'BUYER',
        actorUserId: 'buyer-1',
      })

      expect(tx.$queryRaw).toHaveBeenCalled()
      expect(result.contactUnlockStatus).toBe('UNLOCKED')
      expect(areBothDealPaymentsSuccessful(result.payments)).toBe(true)
    })

    test('returns current deal idempotently when payment already succeeded', async () => {
      const deal = makeDeal({
        payments: [
          makePayment({ paymentStatus: 'SUCCESS' }),
          makePayment({
            id: 'pay-2',
            payerRole: 'SELLER',
            payerUserId: 'seller-1',
            paymentReference: 'DPAY-DEAL-2026-000001-SELLER',
          }),
        ],
      })

      const tx = {
        $queryRaw: jest.fn().mockResolvedValue([]),
        deal: {
          findUnique: jest.fn()
            .mockResolvedValueOnce(deal)
            .mockResolvedValueOnce(deal),
        },
        dealPayment: {
          updateMany: jest.fn(),
          findMany: jest.fn(),
        },
        dealEvent: { create: jest.fn() },
      }

      const db = {
        $transaction: jest.fn(async (fn) => fn(tx)),
      }

      await processDummyDealPayment(db, {
        dealId: deal.id,
        payerRole: 'BUYER',
        actorUserId: 'buyer-1',
      })

      expect(tx.dealPayment.updateMany).not.toHaveBeenCalled()
      expect(tx.dealEvent.create).not.toHaveBeenCalled()
    })
  })
})

describe('assertDummyPaymentAllowed production guard', () => {
  test('rejects dummy payments when disabled', () => {
    jest.resetModules()
    jest.doMock('../config/env.js', () => ({
      allowDummyDealPayments: false,
      isProd: true,
    }))

    const { assertDummyPaymentAllowed: assertBlocked } = require('../services/dealPaymentService.js')

    expect(() => assertBlocked()).toThrow(/not available/i)
  })
})
