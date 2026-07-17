const { z } = require('zod')

const quoteRequestIdParam = z.object({
  id: z.string().uuid(),
})

const rfqGroupIdParam = z.object({
  rfqGroupId: z.string().uuid(),
})

const RFQ_ATTACHMENT_PATH_RE = /^\/api\/quote-requests\/attachments\/file\/[A-Za-z0-9._-]+$/

/** Uploaded RFQ files are served from this API path; absolute https URLs are also allowed. */
function isValidAttachmentUrl(value) {
  const trimmed = String(value || '').trim()
  if (!trimmed) return false
  if (trimmed.startsWith('blob:')) return false
  if (RFQ_ATTACHMENT_PATH_RE.test(trimmed)) return true
  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function normalizeAttachmentsInput(raw) {
  if (raw == null) return undefined
  if (!Array.isArray(raw)) return undefined
  const items = raw
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      name: typeof item.name === 'string' ? item.name.trim() : '',
      url: typeof item.url === 'string' ? item.url.trim() : '',
      mimeType: item.mimeType ?? null,
      sizeBytes: item.sizeBytes,
    }))
    .filter((item) => item.name && item.url)
  return items.length ? items : undefined
}

const attachmentItem = z.object({
  name: z.string().trim().min(1).max(255),
  url: z.string().trim().min(1).max(2000).refine(isValidAttachmentUrl, { message: 'Invalid url' }),
  mimeType: z.string().trim().max(100).optional().nullable(),
  sizeBytes: z.coerce.number().int().min(0).optional().nullable(),
})

const productEntry = z.object({
  productId: z.string().uuid(),
})

const respondQuoteBody = z.object({
  sellerUnitPrice: z.coerce.number().positive().max(1e12),
  sellerCurrency:  z.string().trim().length(3).optional().default('INR'),
  taxNote:         z.string().trim().max(500).optional().nullable(),
  quoteValidUntil: z.string().trim().optional().nullable(),
  freightNote:     z.string().trim().max(1000).optional().nullable(),
  exclusionsNote:  z.string().trim().max(1000).optional().nullable(),
})

const listRequestsQuery = z.object({
  viewAs: z.enum(['buyer', 'seller']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum(['all', 'PENDING', 'RESPONDED', 'ACCEPTED', 'DECLINED', 'NOT_SELECTED', 'CANCELLED']).optional(),
  q: z.string().trim().max(200).optional(),
  expired: z.coerce.boolean().optional(),
})

const groupedListQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum(['all', 'PENDING', 'RESPONDED', 'ACCEPTED', 'DECLINED', 'NOT_SELECTED', 'CANCELLED']).optional(),
  q: z.string().trim().max(200).optional(),
  expired: z.coerce.boolean().optional(),
})

const statsQuery = z.object({
  viewAs: z.enum(['buyer', 'seller']).optional(),
})

const notificationsQuery = z.object({
  since: z.string().trim().optional(),
  unreadOnly: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

const markNotificationsReadBody = z.object({
  ids: z.array(z.string().uuid()).optional(),
  markAll: z.coerce.boolean().optional(),
})

const createQuoteRequestBody = z.object({
  productTitle: z.string().trim().min(1).max(300),
  productId: z.string().uuid().optional(),
  productIds: z.array(z.string().uuid()).optional(),
  productEntries: z.array(productEntry).min(1).max(50).optional(),
  catalogProductId: z.string().max(64).optional(),
  sellerId: z.string().uuid().optional(),
  sellerIds: z.array(z.string().uuid()).min(1).max(50).optional(),
  productCategory: z.string().trim().max(200).optional().nullable(),
  brandName: z.string().trim().max(200).optional().nullable(),
  quantity: z.coerce.number().int().min(1).max(100000).optional().default(1),
  /** Optional indicative budget only — non-binding, informational for sellers. */
  targetPrice: z.coerce.number().positive().max(1e12).optional().nullable(),
  message: z.string().trim().min(1).max(1000),
  deliveryLocation: z.string().trim().min(1).max(500),
  expectedDeliveryDate: z.string().trim().min(1),
  attachments: z.preprocess(normalizeAttachmentsInput, z.array(attachmentItem).max(5).optional()),
}).superRefine((data, ctx) => {
  if (Array.isArray(data.productIds) && data.productIds.length > 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Multi-product RFQ is not supported yet. This feature belongs to a future release.',
      path: ['productIds'],
    })
  }
})

module.exports = {
  quoteRequestIdParam,
  rfqGroupIdParam,
  respondQuoteBody,
  listRequestsQuery,
  groupedListQuery,
  statsQuery,
  notificationsQuery,
  markNotificationsReadBody,
  createQuoteRequestBody,
  isValidAttachmentUrl,
  normalizeAttachmentsInput,
}
