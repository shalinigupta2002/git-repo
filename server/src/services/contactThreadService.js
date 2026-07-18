const { prisma } = require('../config/database.js')

const messageInclude = {
  sender: { select: { id: true, email: true, role: true, companyName: true } },
  replies: {
    orderBy: { createdAt: 'asc' },
    include: {
      author: { select: { id: true, email: true, role: true, companyName: true } },
    },
  },
}

function serializeReply(reply) {
  return {
    id: reply.id,
    body: reply.body,
    attachments: reply.attachments ?? [],
    isAdmin: reply.isAdmin,
    createdAt: reply.createdAt,
    author: reply.author
      ? {
          id: reply.author.id,
          email: reply.author.email,
          role: reply.author.role,
          companyName: reply.author.companyName,
        }
      : null,
  }
}

/** Build chronological thread including legacy adminReply field. */
function serializeContactThread(message) {
  const thread = [
    {
      id: `${message.id}-initial`,
      body: message.message,
      attachments: message.attachments ?? [],
      isAdmin: false,
      createdAt: message.createdAt,
      author: message.sender
        ? {
            id: message.sender.id,
            email: message.sender.email,
            role: message.sender.role,
            companyName: message.sender.companyName,
          }
        : null,
      kind: 'initial',
    },
  ]

  const dbReplies = Array.isArray(message.replies) ? message.replies : []
  const legacyAdminInDb = dbReplies.some((r) => r.isAdmin)

  if (message.adminReply && !legacyAdminInDb) {
    thread.push({
      id: `${message.id}-legacy-admin`,
      body: message.adminReply,
      attachments: [],
      isAdmin: true,
      createdAt: message.repliedAt || message.updatedAt,
      author: { id: 'admin', email: 'admin', role: 'ADMIN', companyName: 'B2B Admin' },
      kind: 'legacy-admin',
    })
  }

  for (const reply of dbReplies) {
    thread.push({ ...serializeReply(reply), kind: 'reply' })
  }

  thread.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

  return {
    ...message,
    thread,
    replies: dbReplies.map(serializeReply),
  }
}

async function findMessageForSender(id, senderId) {
  return prisma.contactMessage.findFirst({
    where: { id, senderId },
    include: messageInclude,
  })
}

async function findMessageById(id) {
  return prisma.contactMessage.findUnique({
    where: { id },
    include: messageInclude,
  })
}

module.exports = {
  messageInclude,
  serializeContactThread,
  findMessageForSender,
  findMessageById,
}
