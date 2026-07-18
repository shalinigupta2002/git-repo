const { prisma }       = require('../config/database.js')
const { asyncHandler } = require('../utils/asyncHandler.js')
const { buildContactAttachments } = require('../middleware/contactUpload.js')
const {
  messageInclude,
  serializeContactThread,
  findMessageForSender,
  findMessageById,
} = require('../services/contactThreadService.js')

// ─── Sender-side (buyer / seller) ─────────────────────────────────────────────

/** POST /api/contact — send a new message to admin (optional image/video attachments) */
const sendMessage = asyncHandler(async (req, res) => {
  const subject = typeof req.body?.subject === 'string' ? req.body.subject : ''
  const message = typeof req.body?.message === 'string' ? req.body.message : ''

  if (!subject.trim()) {
    return res.status(400).json({ success: false, error: { message: 'subject is required' } })
  }
  if (!message.trim()) {
    return res.status(400).json({ success: false, error: { message: 'message is required' } })
  }

  const attachments = buildContactAttachments(req.files)

  const record = await prisma.contactMessage.create({
    data: {
      senderId: req.user.id,
      subject:  subject.trim(),
      message:  message.trim(),
      attachments,
    },
    include: messageInclude,
  })

  res.status(201).json({ success: true, data: { message: serializeContactThread(record) } })
})

/** GET /api/contact — sender's own message threads */
const listMyMessages = asyncHandler(async (req, res) => {
  const messages = await prisma.contactMessage.findMany({
    where:   { senderId: req.user.id },
    orderBy: { updatedAt: 'desc' },
    include: messageInclude,
  })

  res.json({
    success: true,
    data: { messages: messages.map(serializeContactThread) },
  })
})

/** GET /api/contact/:id — single thread for sender */
const getMyMessage = asyncHandler(async (req, res) => {
  const message = await findMessageForSender(req.params.id, req.user.id)
  if (!message) {
    return res.status(404).json({ success: false, error: { message: 'Message not found' } })
  }
  res.json({ success: true, data: { message: serializeContactThread(message) } })
})

/** POST /api/contact/:id/replies — sender follow-up in an existing ticket */
const sendFollowUp = asyncHandler(async (req, res) => {
  const body = typeof req.body?.message === 'string' ? req.body.message.trim() : ''
  if (!body) {
    return res.status(400).json({ success: false, error: { message: 'message is required' } })
  }

  const existing = await findMessageForSender(req.params.id, req.user.id)
  if (!existing) {
    return res.status(404).json({ success: false, error: { message: 'Message not found' } })
  }

  const attachments = buildContactAttachments(req.files)

  const updated = await prisma.$transaction(async (tx) => {
    await tx.contactMessageReply.create({
      data: {
        contactMessageId: existing.id,
        authorId: req.user.id,
        body,
        attachments,
        isAdmin: false,
      },
    })

    return tx.contactMessage.update({
      where: { id: existing.id },
      data: {
        status: 'UNREAD',
        updatedAt: new Date(),
      },
      include: messageInclude,
    })
  })

  res.status(201).json({ success: true, data: { message: serializeContactThread(updated) } })
})

/** GET /api/contact/unread-reply-count — number of unread admin replies for this user */
const unreadReplyCount = asyncHandler(async (req, res) => {
  if (!prisma.contactMessage?.count) {
    return res.json({ success: true, data: { count: 0 } })
  }
  const count = await prisma.contactMessage.count({
    where: {
      senderId:  req.user.id,
      status:    'REPLIED',
      replyRead: false,
    },
  })
  res.json({ success: true, data: { count } })
})

/** PATCH /api/contact/:id/reply-read — mark a reply as read */
const markReplyRead = asyncHandler(async (req, res) => {
  const { id } = req.params
  const existing = await prisma.contactMessage.findFirst({
    where: { id, senderId: req.user.id },
  })
  if (!existing) {
    return res.status(404).json({ success: false, error: { message: 'Message not found' } })
  }

  await prisma.contactMessage.update({
    where: { id },
    data:  { replyRead: true },
  })

  res.json({ success: true, data: { message: 'Marked as read' } })
})

/** PATCH /api/contact/mark-all-replies-read — mark all admin replies as read */
const markAllRepliesRead = asyncHandler(async (req, res) => {
  await prisma.contactMessage.updateMany({
    where: { senderId: req.user.id, status: 'REPLIED', replyRead: false },
    data:  { replyRead: true },
  })
  res.json({ success: true, data: { message: 'All replies marked as read' } })
})

// ─── Admin-side ───────────────────────────────────────────────────────────────

/** GET /api/admin/messages — list all contact messages for admin */
const adminListMessages = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query
  const skip = (Number(page) - 1) * Number(limit)

  const where = {}
  if (status) where.status = status

  const [rows, total] = await Promise.all([
    prisma.contactMessage.findMany({
      where,
      skip,
      take:    Number(limit),
      orderBy: { updatedAt: 'desc' },
      include: messageInclude,
    }),
    prisma.contactMessage.count({ where }),
  ])

  res.json({
    success: true,
    data: {
      messages:   rows.map(serializeContactThread),
      pagination: {
        page:       Number(page),
        limit:      Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)) || 0,
      },
    },
  })
})

/** GET /api/admin/messages/:id — single thread for admin */
const adminGetMessage = asyncHandler(async (req, res) => {
  const message = await findMessageById(req.params.id)
  if (!message) {
    return res.status(404).json({ success: false, error: { message: 'Message not found' } })
  }
  res.json({ success: true, data: { message: serializeContactThread(message) } })
})

/** PATCH /api/admin/messages/:id/read — admin marks a message as read */
const adminMarkRead = asyncHandler(async (req, res) => {
  const { id } = req.params
  const existing = await prisma.contactMessage.findUnique({ where: { id } })
  if (!existing) {
    return res.status(404).json({ success: false, error: { message: 'Message not found' } })
  }

  const updated = await prisma.contactMessage.update({
    where: { id },
    data:  { status: existing.status === 'UNREAD' ? 'READ' : existing.status },
    include: messageInclude,
  })

  res.json({ success: true, data: { message: serializeContactThread(updated) } })
})

/** PATCH /api/admin/messages/:id/reply — admin replies (appends to thread) */
const adminReply = asyncHandler(async (req, res) => {
  const { id }        = req.params
  const { adminReply: replyBody } = req.body

  if (!replyBody?.trim()) {
    return res.status(400).json({ success: false, error: { message: 'adminReply is required' } })
  }

  const existing = await prisma.contactMessage.findUnique({ where: { id } })
  if (!existing) {
    return res.status(404).json({ success: false, error: { message: 'Message not found' } })
  }

  const trimmed = replyBody.trim()
  const now = new Date()

  const updated = await prisma.$transaction(async (tx) => {
    await tx.contactMessageReply.create({
      data: {
        contactMessageId: id,
        authorId: req.user.id,
        body: trimmed,
        attachments: [],
        isAdmin: true,
      },
    })

    return tx.contactMessage.update({
      where: { id },
      data: {
        adminReply: trimmed,
        status:     'REPLIED',
        repliedAt:  now,
        replyRead:  false,
      },
      include: messageInclude,
    })
  })

  res.json({ success: true, data: { message: serializeContactThread(updated) } })
})

/** GET /api/admin/messages/unread-count — count of UNREAD messages for admin badge */
const adminUnreadCount = asyncHandler(async (req, res) => {
  const count = await prisma.contactMessage.count({ where: { status: 'UNREAD' } })
  res.json({ success: true, data: { count } })
})

module.exports = {
  sendMessage,
  listMyMessages,
  getMyMessage,
  sendFollowUp,
  unreadReplyCount,
  markReplyRead,
  markAllRepliesRead,
  adminListMessages,
  adminGetMessage,
  adminMarkRead,
  adminReply,
  adminUnreadCount,
}
