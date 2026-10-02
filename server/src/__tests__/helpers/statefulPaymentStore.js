'use strict'

const { randomUUID } = require('crypto')

/**
 * In-memory Payment + Subscription store with atomic updateMany(PENDING→PAID)
 * for concurrency/idempotency tests (not used in production).
 */
function createStatefulPaymentStore() {
  /** @type {Map<string, object>} */
  const paymentsByOrderId = new Map()
  /** @type {Map<string, object>} */
  const paymentsByRzpPaymentId = new Map()
  /** @type {object[]} */
  const subscriptions = []
  /** @type {Map<string, object>} */
  const users = new Map()

  let txChain = Promise.resolve()

  function runExclusive(fn) {
    const run = txChain.then(fn)
    txChain = run.catch(() => {})
    return run
  }

  function getPaymentByOrder(orderId) {
    return paymentsByOrderId.get(orderId) ?? null
  }

  function setUser(user) {
    users.set(user.id, { ...user })
  }

  function seedPayment(row) {
    const payment = {
      id: row.id ?? randomUUID(),
      userId: row.userId,
      razorpayOrderId: row.razorpayOrderId,
      razorpayPaymentId: row.razorpayPaymentId ?? null,
      razorpaySignature: row.razorpaySignature ?? null,
      plan: row.plan,
      amountPaise: row.amountPaise,
      currency: row.currency ?? 'INR',
      status: row.status ?? 'PENDING',
      subscriptionId: row.subscriptionId ?? null,
    }
    paymentsByOrderId.set(payment.razorpayOrderId, payment)
    if (payment.razorpayPaymentId) {
      paymentsByRzpPaymentId.set(payment.razorpayPaymentId, payment)
    }
    return payment
  }

  function assertUniqueRzpPaymentId(paymentId, exceptOrderId) {
    if (!paymentId) return
    const other = paymentsByRzpPaymentId.get(paymentId)
    if (other && other.razorpayOrderId !== exceptOrderId) {
      const err = new Error('Unique constraint failed on razorpay_payment_id')
      err.code = 'P2002'
      throw err
    }
  }

  const prisma = {
    user: {
      findUnique: jest.fn(async ({ where, select }) => {
        const u = users.get(where.id)
        if (!u) return null
        if (!select) return { ...u }
        const out = {}
        for (const key of Object.keys(select)) {
          if (select[key]) out[key] = u[key]
        }
        return out
      }),
      update: jest.fn(async ({ where, data }) => {
        const u = { ...users.get(where.id), ...data }
        users.set(where.id, u)
        return u
      }),
    },
    payment: {
      findUnique: jest.fn(async ({ where, select }) => {
        const p = getPaymentByOrder(where.razorpayOrderId)
        if (!p) return null
        if (!select) return { ...p }
        const out = {}
        for (const key of Object.keys(select)) {
          if (select[key]) out[key] = p[key]
        }
        return out
      }),
      findFirst: jest.fn(async ({ where }) => {
        if (where.razorpayPaymentId) {
          return paymentsByRzpPaymentId.get(where.razorpayPaymentId) ?? null
        }
        return null
      }),
      update: jest.fn(async ({ where, data }) => {
        const p = getPaymentByOrder(where.razorpayOrderId)
        if (!p) throw new Error('payment not found')
        if (data.razorpayPaymentId) {
          assertUniqueRzpPaymentId(data.razorpayPaymentId, p.razorpayOrderId)
        }
        Object.assign(p, data)
        if (p.razorpayPaymentId) {
          paymentsByRzpPaymentId.set(p.razorpayPaymentId, p)
        }
        return { ...p }
      }),
      updateMany: jest.fn(async ({ where, data }) => {
        const p = getPaymentByOrder(where.razorpayOrderId)
        if (!p || p.status !== where.status) return { count: 0 }
        if (data.razorpayPaymentId) {
          assertUniqueRzpPaymentId(data.razorpayPaymentId, p.razorpayOrderId)
        }
        const prevPaymentId = p.razorpayPaymentId
        Object.assign(p, data)
        if (prevPaymentId && prevPaymentId !== p.razorpayPaymentId) {
          paymentsByRzpPaymentId.delete(prevPaymentId)
        }
        if (p.razorpayPaymentId) {
          paymentsByRzpPaymentId.set(p.razorpayPaymentId, p)
        }
        return { count: 1 }
      }),
    },
    subscription: {
      findFirst: jest.fn(async ({ where }) => {
        const now = new Date()
        return (
          subscriptions.find((s) => {
            if (s.userId !== where.userId) return false
            if (where.plan?.in && !where.plan.in.includes(s.plan)) return false
            if (where.status && s.status !== where.status) return false
            if (where.OR) {
              const ok = where.OR.some((clause) => {
                if (clause.expiresAt === null) return s.expiresAt === null
                if (clause.expiresAt?.gt) return s.expiresAt && s.expiresAt > clause.expiresAt.gt
                return false
              })
              if (!ok) return false
            }
            return s.status === 'ACTIVE'
          }) ?? null
        )
      }),
      findUnique: jest.fn(async ({ where, select }) => {
        const s = subscriptions.find((row) => row.id === where.id)
        if (!s) return null
        if (!select) return { ...s }
        const out = {}
        for (const key of Object.keys(select)) {
          if (select[key]) out[key] = s[key]
        }
        return out
      }),
      findMany: jest.fn(async ({ where }) =>
        subscriptions.filter((s) => {
          if (where.userId && s.userId !== where.userId) return false
          if (where.plan?.in && !where.plan.in.includes(s.plan)) return false
          if (where.status && s.status !== where.status) return false
          return true
        }),
      ),
      create: jest.fn(async ({ data }) => {
        const sub = {
          id: randomUUID(),
          startsAt: new Date(),
          status: 'ACTIVE',
          expiresAt: data.expiresAt ?? null,
          ...data,
        }
        subscriptions.push(sub)
        return sub
      }),
    },
    $transaction: jest.fn(async (fn) => runExclusive(() => fn(prisma))),
  }

  return {
    prisma,
    seedPayment,
    setUser,
    getPaymentByOrder,
    getSubscriptions: () => [...subscriptions],
    reset() {
      paymentsByOrderId.clear()
      paymentsByRzpPaymentId.clear()
      subscriptions.length = 0
      users.clear()
      txChain = Promise.resolve()
    },
  }
}

module.exports = { createStatefulPaymentStore }
