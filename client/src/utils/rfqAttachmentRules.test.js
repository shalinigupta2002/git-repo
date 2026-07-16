import { describe, expect, it } from 'vitest'
import {
  RFQ_MAX_FILES,
  formatFileSize,
  validateRfqFile,
} from './rfqAttachmentRules.js'

describe('rfqAttachmentRules', () => {
  it('accepts png within 5 MB', () => {
    const file = { name: 'spec.png', type: 'image/png', size: 1024 }
    expect(validateRfqFile(file)).toBeNull()
  })

  it('rejects unsupported file types', () => {
    const file = { name: 'notes.txt', type: 'text/plain', size: 100 }
    expect(validateRfqFile(file)).toMatch(/not a supported file type/)
  })

  it('rejects oversized images', () => {
    const file = { name: 'big.png', type: 'image/png', size: 6 * 1024 * 1024 }
    expect(validateRfqFile(file)).toMatch(/5 MB/)
  })

  it('formats file sizes', () => {
    expect(formatFileSize(2048)).toBe('2.0 KB')
  })

  it('exposes max file count', () => {
    expect(RFQ_MAX_FILES).toBe(5)
  })
})
