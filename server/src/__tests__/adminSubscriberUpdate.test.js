'use strict'

jest.mock('../../src/config/database')
jest.mock('../../src/utils/audit')

const { agent, cookieFor, makeToken, IDS } = require('../../src/__tests__/helpers')
const { prisma } = require('../../src/config/database')
const { writeAuditLog } = require('../../src/utils/audit')

const adminToken = makeToken({ id: IDS.ADMIN, role: 'ADMIN', email: 'admin@b2b.test' })

const targetUserId = IDS.BUYER // Use a valid UUID to pass the params validator!
const existingUserRecord = {
  id: targetUserId,
  email: 'subscriber@b2b.test',
  role: 'BUYER',
  buyerSubscriptionPlan: 'BUYER_MONTHLY',
  buyerSubscriptionStatus: 'ACTIVE',
  buyerSubscriptionActivatedAt: new Date('2026-06-25T15:30:00+05:30'),
  sellerSubscriptionPlan: null,
  sellerSubscriptionStatus: null,
  sellerSubscriptionActivatedAt: null,
  isActive: true,
  subscriptions: [
    {
      id: 'sub-id-1',
      userId: targetUserId,
      plan: 'BUYER_MONTHLY',
      status: 'ACTIVE',
      startsAt: new Date('2026-06-25T15:30:00+05:30'),
      expiresAt: new Date('2026-07-23T15:30:00+05:30'),
    }
  ]
}

describe('Admin Subscriber Expiry Edit APIs', () => {
  beforeEach(() => {
    prisma.$transaction.mockImplementation(async (fn) => fn(prisma))
    prisma.user.findUnique.mockImplementation(async ({ where }) => {
      if (where.id === IDS.ADMIN) {
        return { id: IDS.ADMIN, role: 'ADMIN', email: 'admin@b2b.test', isActive: true }
      }
      return existingUserRecord
    })
    jest.clearAllMocks()
  })

  // Test 1: Extend subscription to a future date
  test('Extend subscription expiry to tomorrow -> stays ACTIVE', async () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowISO = tomorrow.toISOString()

    prisma.user.update.mockResolvedValue({
      ...existingUserRecord,
      subscriptions: [
        {
          ...existingUserRecord.subscriptions[0],
          expiresAt: tomorrow,
        }
      ]
    })

    // Mock reload and sync in transaction
    prisma.user.findUnique.mockImplementation(async ({ where }) => {
      if (where.id === IDS.ADMIN) {
        return { id: IDS.ADMIN, role: 'ADMIN', email: 'admin@b2b.test', isActive: true }
      }
      return {
        ...existingUserRecord,
        subscriptions: [
          {
            ...existingUserRecord.subscriptions[0],
            expiresAt: tomorrow,
          }
        ]
      }
    })

    const res = await agent
      .patch(`/api/admin/subscribers/${targetUserId}`)
      .set(cookieFor(adminToken))
      .send({
        expiresAt: tomorrowISO
      })

    expect(res.status).toBe(200)
    expect(prisma.subscription.update).toHaveBeenCalledWith({
      where: { id: 'sub-id-1' },
      data: {
        startsAt: expect.any(Date),
        expiresAt: expect.any(Date),
        status: 'ACTIVE'
      }
    })
    expect(writeAuditLog).toHaveBeenCalled()
  })

  // Test 2: Reactivate an expired subscription by setting a future date
  test('Reactivate expired subscription by setting future expiry -> ACTIVE', async () => {
    const expiredRecord = {
      ...existingUserRecord,
      buyerSubscriptionStatus: 'EXPIRED',
      subscriptions: [
        {
          ...existingUserRecord.subscriptions[0],
          status: 'EXPIRED',
          expiresAt: new Date('2026-07-23T15:00:00+05:30')
        }
      ]
    }

    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)
    const nextWeekISO = nextWeek.toISOString()

    prisma.user.findUnique.mockImplementation(async ({ where }) => {
      if (where.id === IDS.ADMIN) {
        return { id: IDS.ADMIN, role: 'ADMIN', email: 'admin@b2b.test', isActive: true }
      }
      return expiredRecord
    })

    // Mock updates
    prisma.user.update.mockResolvedValue({
      ...expiredRecord,
      subscriptions: [
        {
          ...expiredRecord.subscriptions[0],
          status: 'ACTIVE',
          expiresAt: nextWeek,
        }
      ]
    })

    const res = await agent
      .patch(`/api/admin/subscribers/${targetUserId}`)
      .set(cookieFor(adminToken))
      .send({
        expiresAt: nextWeekISO
      })

    expect(res.status).toBe(200)
    expect(prisma.subscription.update).toHaveBeenCalledWith({
      where: { id: 'sub-id-1' },
      data: {
        startsAt: expect.any(Date),
        expiresAt: expect.any(Date),
        status: 'ACTIVE'
      }
    })
  })

  // Test 3: Shorten expiry to a past date
  test('Shorten expiry to a past date -> immediately EXPIRED', async () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayISO = yesterday.toISOString()

    prisma.user.update.mockResolvedValue({
      ...existingUserRecord,
      subscriptions: [
        {
          ...existingUserRecord.subscriptions[0],
          expiresAt: yesterday,
        }
      ]
    })

    prisma.user.findUnique.mockImplementation(async ({ where }) => {
      if (where.id === IDS.ADMIN) {
        return { id: IDS.ADMIN, role: 'ADMIN', email: 'admin@b2b.test', isActive: true }
      }
      return {
        ...existingUserRecord,
        subscriptions: [
          {
            ...existingUserRecord.subscriptions[0],
            expiresAt: yesterday,
          }
        ]
      }
    })

    const res = await agent
      .patch(`/api/admin/subscribers/${targetUserId}`)
      .set(cookieFor(adminToken))
      .send({
        expiresAt: yesterdayISO
      })

    expect(res.status).toBe(200)
    expect(prisma.subscription.update).toHaveBeenCalledWith({
      where: { id: 'sub-id-1' },
      data: {
        startsAt: expect.any(Date),
        expiresAt: expect.any(Date),
        status: 'EXPIRED'
      }
    })
  })

  // Test 4: Prevent invalid dates (Expires At cannot be earlier than Starts At)
  test('Prevent expiresAt earlier than startsAt -> 400 validation error', async () => {
    const earlierDate = new Date(existingUserRecord.subscriptions[0].startsAt.getTime() - 10000).toISOString()

    const res = await agent
      .patch(`/api/admin/subscribers/${targetUserId}`)
      .set(cookieFor(adminToken))
      .send({
        expiresAt: earlierDate
      })

    expect(res.status).toBe(400)
    expect(res.body.error.message).toBe('Expires At cannot be earlier than Starts At.')
  })
})
