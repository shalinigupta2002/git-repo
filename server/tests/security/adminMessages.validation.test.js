'use strict'

jest.mock('../../src/config/database')

const { agent, cookieFor, makeToken, IDS } = require('../../src/__tests__/helpers')
const { prisma } = require('../../src/config/database')

const adminToken = makeToken({ id: IDS.ADMIN, role: 'ADMIN' })
const buyerToken = makeToken({ id: IDS.BUYER, role: 'BUYER' })

const VALID_MSG_ID = '77777777-7777-4777-8777-777777777777'

function mockAdminUser() {
  prisma.user.findUnique.mockResolvedValue({ id: IDS.ADMIN, role: 'ADMIN' })
}

function mockContactMessageRow(overrides = {}) {
  return {
    id: VALID_MSG_ID,
    status: 'UNREAD',
    subject: 'Help',
    message: 'Need assistance',
    attachments: [],
    adminReply: null,
    repliedAt: null,
    replyRead: false,
    createdAt: new Date('2024-06-01T00:00:00.000Z'),
    updatedAt: new Date('2024-06-02T00:00:00.000Z'),
    sender: {
      id: IDS.BUYER,
      email: 'buyer@test.com',
      role: 'BUYER',
      companyName: 'Buyer Co',
    },
    replies: [],
    ...overrides,
  }
}

function mockAdminMessageList(rows = [], total = 0) {
  prisma.contactMessage.findMany.mockResolvedValue(rows)
  prisma.contactMessage.count.mockResolvedValue(total)
}

describe('GET /api/admin/messages (VAL-003)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('valid status filter returns 200 and applies where clause', async () => {
    mockAdminUser()
    mockAdminMessageList([mockContactMessageRow({ status: 'REPLIED' })], 1)

    const res = await agent
      .get('/api/admin/messages?status=REPLIED')
      .set(cookieFor(adminToken))

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.messages).toHaveLength(1)
    expect(prisma.contactMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'REPLIED' } }),
    )
  })

  test('invalid status returns 400 VALIDATION_ERROR', async () => {
    mockAdminUser()

    const res = await agent
      .get('/api/admin/messages?status=PENDING')
      .set(cookieFor(adminToken))

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(prisma.contactMessage.findMany).not.toHaveBeenCalled()
    expect(prisma.contactMessage.count).not.toHaveBeenCalled()
  })

  test('omitted query uses defaults page=1 limit=20', async () => {
    mockAdminUser()
    mockAdminMessageList([], 0)

    const res = await agent.get('/api/admin/messages').set(cookieFor(adminToken))

    expect(res.status).toBe(200)
    expect(res.body.data.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    })
    expect(prisma.contactMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 20, where: {} }),
    )
  })

  test('valid page and limit are accepted', async () => {
    mockAdminUser()
    mockAdminMessageList([], 40)

    const res = await agent
      .get('/api/admin/messages?page=3&limit=15')
      .set(cookieFor(adminToken))

    expect(res.status).toBe(200)
    expect(res.body.data.pagination.page).toBe(3)
    expect(res.body.data.pagination.limit).toBe(15)
    expect(prisma.contactMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 30, take: 15 }),
    )
  })

  test.each([
    ['page', 'abc'],
    ['page', '2.5'],
    ['page', '0'],
    ['page', '-1'],
    ['limit', 'xyz'],
    ['limit', '0'],
    ['limit', '-5'],
    ['limit', '101'],
  ])('invalid %s=%s returns 400 and skips Prisma', async (param, value) => {
    mockAdminUser()

    const res = await agent
      .get(`/api/admin/messages?${param}=${value}`)
      .set(cookieFor(adminToken))

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(prisma.contactMessage.findMany).not.toHaveBeenCalled()
    expect(prisma.contactMessage.count).not.toHaveBeenCalled()
  })

  test('401 without authentication', async () => {
    const res = await agent.get('/api/admin/messages')
    expect(res.status).toBe(401)
    expect(prisma.contactMessage.findMany).not.toHaveBeenCalled()
  })

  test('403 for non-admin user', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: IDS.BUYER, role: 'BUYER' })

    const res = await agent.get('/api/admin/messages').set(cookieFor(buyerToken))

    expect(res.status).toBe(403)
    expect(prisma.contactMessage.findMany).not.toHaveBeenCalled()
  })
})
