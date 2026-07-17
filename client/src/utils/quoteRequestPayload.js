const RFQ_ATTACHMENT_PATH_RE = /^\/api\/quote-requests\/attachments\/file\/[A-Za-z0-9._-]+$/

export function isValidQuoteAttachmentUrl(url) {
  const trimmed = String(url || '').trim()
  if (!trimmed) return false
  if (trimmed === 'null' || trimmed === 'undefined') return false
  if (trimmed.startsWith('blob:')) return false
  if (RFQ_ATTACHMENT_PATH_RE.test(trimmed)) return true
  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Strip malformed attachment entries before POST /quote-requests.
 * Returns undefined when there are no valid attachments (field omitted).
 */
export function sanitizeQuoteRequestAttachments(attachments) {
  if (attachments == null) return undefined
  if (!Array.isArray(attachments)) return undefined

  const cleaned = attachments
    .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
    .map((item) => ({
      name: String(item.name ?? '').trim(),
      url: String(item.url ?? '').trim(),
      mimeType: item.mimeType ?? null,
      sizeBytes: item.sizeBytes ?? null,
    }))
    .filter((item) => item.name && isValidQuoteAttachmentUrl(item.url))

  return cleaned.length ? cleaned : undefined
}

export function buildCreateQuoteRequestPayload(payload = {}) {
  const body = { ...payload }
  const attachments = sanitizeQuoteRequestAttachments(body.attachments)
  if (attachments) {
    body.attachments = attachments
  } else {
    delete body.attachments
  }
  return body
}

export function quoteRequestPayload(product, message) {
  const body = {
    productTitle: product.title,
    productCategory: product.category?.name,
    brandName: product.brand?.name,
    quantity: 1,
    targetPrice: product.price,
    message,
  }
  if (product.source === 'seller') {
    body.productId = product.id
    if (product.seller?.id) body.sellerId = product.seller.id
  } else {
    body.catalogProductId = product.id
  }
  return body
}
