'use strict'

jest.mock('../../src/config/database')

const contactController = require('../../src/controllers/contactController.js')
const { agent, cookieFor, makeToken, IDS } = require('../../src/__tests__/helpers')
const { prisma } = require('../../src/config/database')

const buyerToken = makeToken({ id: IDS.BUYER, role: 'BUYER' })
const adminToken = makeToken({ id: IDS.ADMIN, role: 'ADMIN' })

const VALID_MSG_ID = '77777777-7777-4777-8777-777777777777'

function mockBuyerAuth() {
  prisma.user.findUnique.mockResolvedValue({ id: IDS.BUYER, role: 'BUYER' })
}

function mockAdminAuth() {
  prisma.user.findUnique.mockResolvedValue({ id: IDS.ADMIN, role: 'ADMIN' })
}

function mockThreadRecord(overrides = {}) {
  return {
    id: VALID_MSG_ID,
    subject: 'Help',
    message: 'Initial',
    attachments: [],
    adminReply: null,
    repliedAt: null,
    replyRead: false,
    status: 'UNREAD',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-02T00:00:00.000Z'),
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

describe('Contact message body length (VAL-005)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/contact', () => {
    test('accepts subject at exactly 300 characters and message at 5000', async () => {
      mockBuyerAuth()
      const subject = 'S'.repeat(300)
      const message = 'M'.repeat(5000)
      prisma.contactMessage.create.mockResolvedValue(mockThreadRecord({ subject, message }))

      const res = await agent
        .post('/api/contact')
        .set(cookieFor(buyerToken))
        .send({ subject, message })

      expect(res.status).toBe(201)
      expect(prisma.contactMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ subject, message }),
        }),
      )
    })

    test('rejects subject longer than 300 with VALIDATION_ERROR', async () => {
      mockBuyerAuth()
      const spy = jest.spyOn(contactController, 'sendMessage')

      const res = await agent
        .post('/api/contact')
        .set(cookieFor(buyerToken))
        .send({ subject: 'S'.repeat(301), message: 'Hello' })

      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('VALIDATION_ERROR')
      expect(spy).not.toHaveBeenCalled()
      expect(prisma.contactMessage.create).not.toHaveBeenCalled()
      spy.mockRestore()
    })

    test('rejects message longer than 5000 with VALIDATION_ERROR', async () => {
      mockBuyerAuth()

      const res = await agent
        .post('/api/contact')
        .set(cookieFor(buyerToken))
        .send({ subject: 'Subject', message: 'M'.repeat(5001) })

      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('VALIDATION_ERROR')
      expect(prisma.contactMessage.create).not.toHaveBeenCalled()
    })

    test('empty subject still rejected (required min length)', async () => {
      mockBuyerAuth()

      const res = await agent
        .post('/api/contact')
        .set(cookieFor(buyerToken))
        .send({ subject: '   ', message: 'Hello' })

      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('VALIDATION_ERROR')
      expect(prisma.contactMessage.create).not.toHaveBeenCalled()
    })

    test('401 without authentication', async () => {
      const res = await agent.post('/api/contact').send({ subject: 'Hi', message: 'There' })
      expect(res.status).toBe(401)
      expect(prisma.contactMessage.create).not.toHaveBeenCalled()
    })
  })

  describe('POST /api/contact/:id/replies', () => {
    test('accepts message at exactly 5000 characters', async () => {
      mockBuyerAuth()
      const body = 'F'.repeat(5000)
      prisma.contactMessage.findFirst.mockResolvedValue(mockThreadRecord())
      prisma.$transaction.mockImplementation(async (fn) => fn(prisma))
      prisma.contactMessageReply.create.mockResolvedValue({})
      prisma.contactMessage.update.mockResolvedValue(mockThreadRecord({ message: body }))

      const res = await agent
        .post(`/api/contact/${VALID_MSG_ID}/replies`)
        .set(cookieFor(buyerToken))
        .send({ message: body })

      expect(res.status).toBe(201)
      expect(prisma.contactMessageReply.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ body }) }),
      )
    })

    test('rejects message longer than 5000', async () => {
      mockBuyerAuth()

      const res = await agent
        .post(`/api/contact/${VALID_MSG_ID}/replies`)
        .set(cookieFor(buyerToken))
        .send({ message: 'X'.repeat(5001) })

      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('VALIDATION_ERROR')
      expect(prisma.contactMessage.findFirst).not.toHaveBeenCalled()
    })
  })

  describe('PATCH /api/admin/messages/:id/reply', () => {
    test('accepts adminReply at exactly 5000 characters', async () => {
      mockAdminAuth()
      const adminReply = 'A'.repeat(5000)
      prisma.contactMessage.findUnique.mockResolvedValue(mockThreadRecord())
      prisma.$transaction.mockImplementation(async (fn) => fn(prisma))
      prisma.contactMessageReply.create.mockResolvedValue({})
      prisma.contactMessage.update.mockResolvedValue(mockThreadRecord({ adminReply }))

      const res = await agent
        .patch(`/api/admin/messages/${VALID_MSG_ID}/reply`)
        .set(cookieFor(adminToken))
        .send({ adminReply })

      expect(res.status).toBe(200)
      expect(prisma.contactMessageReply.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ body: adminReply }) }),
      )
    })

    test('rejects adminReply longer than 5000', async () => {
      mockAdminAuth()

      const res = await agent
        .patch(`/api/admin/messages/${VALID_MSG_ID}/reply`)
        .set(cookieFor(adminToken))
        .send({ adminReply: 'R'.repeat(5001) })

      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('VALIDATION_ERROR')
      expect(prisma.contactMessage.findUnique).not.toHaveBeenCalled()
    })

    test('403 for non-admin', async () => {
      mockBuyerAuth()

      const res = await agent
        .patch(`/api/admin/messages/${VALID_MSG_ID}/reply`)
        .set(cookieFor(buyerToken))
        .send({ adminReply: 'Hi' })

      expect(res.status).toBe(403)
      expect(prisma.contactMessage.findUnique).not.toHaveBeenCalled()
    })
  })
})
