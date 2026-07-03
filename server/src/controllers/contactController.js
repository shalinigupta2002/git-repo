const { prisma }       = require('../config/database.js')
const { asyncHandler } = require('../utils/asyncHandler.js')
const { buildContactAttachments } = require('../middleware/contactUpload.js')

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
  })

  res.status(201).json({ success: true, data: { message: record } })
})

/** GET /api/contact — sender's own message thread */
const listMyMessages = asyncHandler(async (req, res) => {
  const messages = await prisma.contactMessage.findMany({
    where:   { senderId: req.user.id },
    orderBy: { createdAt: 'desc' },
  })

  res.json({ success: true, data: { messages } })
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
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, email: true, role: true, companyName: true } },
      },
    }),
    prisma.contactMessage.count({ where }),
  ])

  res.json({
    success: true,
    data: {
      messages:   rows,
      pagination: {
        page:       Number(page),
        limit:      Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)) || 0,
      },
    },
  })
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
  })

  res.json({ success: true, data: { message: updated } })
})

/** PATCH /api/admin/messages/:id/reply — admin replies to a message */
const adminReply = asyncHandler(async (req, res) => {
  const { id }        = req.params
  const { adminReply } = req.body

  if (!adminReply?.trim()) {
    return res.status(400).json({ success: false, error: { message: 'adminReply is required' } })
  }

  const existing = await prisma.contactMessage.findUnique({ where: { id } })
  if (!existing) {
    return res.status(404).json({ success: false, error: { message: 'Message not found' } })
  }

  const updated = await prisma.contactMessage.update({
    where: { id },
    data: {
      adminReply: adminReply.trim(),
      status:     'REPLIED',
      repliedAt:  new Date(),
      replyRead:  false,
    },
    include: {
      sender: { select: { id: true, email: true, role: true, companyName: true } },
    },
  })

  res.json({ success: true, data: { message: updated } })
})

/** GET /api/admin/messages/unread-count — count of UNREAD messages for admin badge */
const adminUnreadCount = asyncHandler(async (req, res) => {
  const count = await prisma.contactMessage.count({ where: { status: 'UNREAD' } })
  res.json({ success: true, data: { count } })
})

module.exports = {
  sendMessage,
  listMyMessages,
  unreadReplyCount,
  markReplyRead,
  markAllRepliesRead,
  adminListMessages,
  adminMarkRead,
  adminReply,
  adminUnreadCount,
}
