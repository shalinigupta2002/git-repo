import { describe, expect, it } from 'vitest'
import { normalizeApiBaseUrl } from '../constants/env.js'

describe('normalizeApiBaseUrl', () => {
  it('strips accidental .env line pasted into Vercel value', () => {
    expect(
      normalizeApiBaseUrl(
        'VITE_API_BASE_URL=https://git-repo-az5t.onrender.com/api',
        { isProd: true },
      ),
    ).toBe('https://git-repo-az5t.onrender.com/api')
  })

  it('strips leading slash before env line fragment', () => {
    expect(
      normalizeApiBaseUrl(
        '/VITE_API_BASE_URL=https://git-repo-az5t.onrender.com/api',
        { isProd: true },
      ),
    ).toBe('https://git-repo-az5t.onrender.com/api')
  })

  it('appends /api when host given without path', () => {
    expect(
      normalizeApiBaseUrl('https://git-repo-az5t.onrender.com', { isProd: true }),
    ).toBe('https://git-repo-az5t.onrender.com/api')
  })

  it('defaults to localhost in development when unset', () => {
    expect(normalizeApiBaseUrl('', { isProd: false })).toBe('http://localhost:3001/api')
  })
})
