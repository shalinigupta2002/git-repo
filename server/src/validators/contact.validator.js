const { z } = require('zod')

/** POST /api/contact — aligns with ContactMessage VarChar limits in Prisma. */
const createContactMessageBody = z.object({
  subject: z.string().trim().min(1, 'subject is required').max(300),
  message: z.string().trim().min(1, 'message is required').max(5000),
})

/** POST /api/contact/:id/replies — body optional when attachments are present. */
const contactFollowUpBody = z.object({
  message: z.string().trim().max(5000).optional().default(''),
})

/** PATCH /api/admin/messages/:id/reply — stored on ContactMessageReply.body (5000). */
const adminContactReplyBody = z.object({
  adminReply: z.string().trim().min(1, 'adminReply is required').max(5000),
})

module.exports = {
  createContactMessageBody,
  contactFollowUpBody,
  adminContactReplyBody,
}
