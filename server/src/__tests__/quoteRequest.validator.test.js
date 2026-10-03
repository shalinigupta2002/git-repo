'use strict'

const { createQuoteRequestBody } = require('../../src/validators/quoteRequest.validator.js')

const basePayload = {
  productTitle: 'Test Widget',
  quantity: 5,
  message: 'Need 5 units with standard packaging.',
  deliveryLocation: 'Mumbai, Maharashtra',
  expectedDeliveryDate: '2026-08-01',
  productId: '11111111-1111-4111-8111-111111111111',
}

describe('createQuoteRequestBody expectedDeliveryDate', () => {
  test('accepts YYYY-MM-DD date-only value', () => {
    const result = createQuoteRequestBody.safeParse(basePayload)
    expect(result.success).toBe(true)
    expect(result.data.expectedDeliveryDate).toBe('2026-08-01')
  })

  test('accepts valid ISO datetime', () => {
    const result = createQuoteRequestBody.safeParse({
      ...basePayload,
      expectedDeliveryDate: '2026-08-15T00:00:00.000Z',
    })
    expect(result.success).toBe(true)
    expect(result.data.expectedDeliveryDate).toBe('2026-08-15T00:00:00.000Z')
  })

  test('rejects invalid date string', () => {
    const result = createQuoteRequestBody.safeParse({
      ...basePayload,
      expectedDeliveryDate: 'not-a-valid-date',
    })
    expect(result.success).toBe(false)
    expect(result.error.flatten().fieldErrors.expectedDeliveryDate).toContain(
      'expectedDeliveryDate must be a valid date',
    )
  })

  test('rejects malformed date value', () => {
    const result = createQuoteRequestBody.safeParse({
      ...basePayload,
      expectedDeliveryDate: '2026-13-45',
    })
    expect(result.success).toBe(false)
    expect(result.error.flatten().fieldErrors.expectedDeliveryDate).toContain(
      'expectedDeliveryDate must be a valid date',
    )
  })

  test('rejects blank and whitespace-only values', () => {
    for (const value of ['', '   ']) {
      const result = createQuoteRequestBody.safeParse({
        ...basePayload,
        expectedDeliveryDate: value,
      })
      expect(result.success).toBe(false)
      expect(result.error.flatten().fieldErrors.expectedDeliveryDate).toBeDefined()
    }
  })
})

describe('createQuoteRequestBody attachments', () => {
  test('accepts payload with attachments omitted', () => {
    const result = createQuoteRequestBody.safeParse(basePayload)
    expect(result.success).toBe(true)
    expect(result.data.attachments).toBeUndefined()
  })

  test('accepts empty attachments array', () => {
    const result = createQuoteRequestBody.safeParse({ ...basePayload, attachments: [] })
    expect(result.success).toBe(true)
    expect(result.data.attachments).toBeUndefined()
  })

  test('accepts attachments null', () => {
    const result = createQuoteRequestBody.safeParse({ ...basePayload, attachments: null })
    expect(result.success).toBe(true)
    expect(result.data.attachments).toBeUndefined()
  })

  test('accepts uploaded relative API attachment URL', () => {
    const result = createQuoteRequestBody.safeParse({
      ...basePayload,
      attachments: [{
        name: 'spec.pdf',
        url: '/api/quote-requests/attachments/file/1700000000000-deadbeef.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 2048,
      }],
    })
    expect(result.success).toBe(true)
    expect(result.data.attachments).toHaveLength(1)
  })

  test('accepts absolute https attachment URL', () => {
    const result = createQuoteRequestBody.safeParse({
      ...basePayload,
      attachments: [{
        name: 'spec.pdf',
        url: 'https://cdn.example.com/spec.pdf',
      }],
    })
    expect(result.success).toBe(true)
  })

  test('accepts multiple attachment URLs', () => {
    const result = createQuoteRequestBody.safeParse({
      ...basePayload,
      attachments: [
        {
          name: 'a.pdf',
          url: '/api/quote-requests/attachments/file/a.pdf',
        },
        {
          name: 'b.pdf',
          url: 'https://cdn.example.com/b.pdf',
        },
      ],
    })
    expect(result.success).toBe(true)
    expect(result.data.attachments).toHaveLength(2)
  })

  test('rejects malformed attachment URL', () => {
    const result = createQuoteRequestBody.safeParse({
      ...basePayload,
      attachments: [{ name: 'bad.pdf', url: 'not-a-url' }],
    })
    expect(result.success).toBe(false)
    expect(result.error.flatten().fieldErrors.attachments).toContain('Invalid url')
  })

  test('rejects blob URL', () => {
    const result = createQuoteRequestBody.safeParse({
      ...basePayload,
      attachments: [{ name: 'blob.pdf', url: 'blob:http://localhost/abc' }],
    })
    expect(result.success).toBe(false)
  })

  test('drops empty-string attachment entries', () => {
    const result = createQuoteRequestBody.safeParse({
      ...basePayload,
      attachments: [{ name: 'empty.pdf', url: '' }],
    })
    expect(result.success).toBe(true)
    expect(result.data.attachments).toBeUndefined()
  })
})
