import { describe, expect, it } from 'vitest'
import {
  buildCreateQuoteRequestPayload,
  isValidQuoteAttachmentUrl,
  sanitizeQuoteRequestAttachments,
} from './quoteRequestPayload.js'

describe('quoteRequestPayload attachments', () => {
  it('returns undefined for empty, null, or missing attachments', () => {
    expect(sanitizeQuoteRequestAttachments(undefined)).toBeUndefined()
    expect(sanitizeQuoteRequestAttachments(null)).toBeUndefined()
    expect(sanitizeQuoteRequestAttachments([])).toBeUndefined()
  })

  it('keeps uploaded API attachment URLs', () => {
    const items = sanitizeQuoteRequestAttachments([
      {
        name: 'spec.pdf',
        url: '/api/quote-requests/attachments/file/1700000000000-deadbeef.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 100,
      },
    ])
    expect(items).toHaveLength(1)
    expect(items[0].url).toMatch(/^\/api\/quote-requests\/attachments\/file\//)
  })

  it('keeps multiple valid attachment URLs', () => {
    const items = sanitizeQuoteRequestAttachments([
      { name: 'a.pdf', url: '/api/quote-requests/attachments/file/a.pdf' },
      { name: 'b.pdf', url: 'https://cdn.example.com/b.pdf' },
    ])
    expect(items).toHaveLength(2)
  })

  it('drops empty-string, blob, and placeholder URLs', () => {
    expect(sanitizeQuoteRequestAttachments([{ name: 'x.pdf', url: '' }])).toBeUndefined()
    expect(sanitizeQuoteRequestAttachments([{ name: 'x.pdf', url: 'blob:http://localhost/x' }])).toBeUndefined()
    expect(sanitizeQuoteRequestAttachments([{ name: 'x.pdf', url: 'null' }])).toBeUndefined()
    expect(sanitizeQuoteRequestAttachments([{ name: 'x.pdf', url: 'undefined' }])).toBeUndefined()
  })

  it('omits attachments field when building payload without files', () => {
    const body = buildCreateQuoteRequestPayload({
      productTitle: 'Widget',
      message: 'Need quote',
      deliveryLocation: 'Mumbai',
      expectedDeliveryDate: '2026-12-31',
      attachments: [],
    })
    expect(body.attachments).toBeUndefined()
    expect(Object.prototype.hasOwnProperty.call(body, 'attachments')).toBe(false)
  })

  it('does not send malformed attachment arrays', () => {
    const body = buildCreateQuoteRequestPayload({
      productTitle: 'Widget',
      message: 'Need quote',
      attachments: [{ name: '', url: '' }],
    })
    expect(body.attachments).toBeUndefined()
  })

  it('validates attachment URL helper', () => {
    expect(isValidQuoteAttachmentUrl('/api/quote-requests/attachments/file/test.pdf')).toBe(true)
    expect(isValidQuoteAttachmentUrl('https://example.com/file.pdf')).toBe(true)
    expect(isValidQuoteAttachmentUrl('blob:http://localhost/x')).toBe(false)
    expect(isValidQuoteAttachmentUrl('')).toBe(false)
  })
})
