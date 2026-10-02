/**
 * Ensures browser auth modules do not persist JWTs in web storage.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const AUTH_SOURCE_FILES = [
  'utils/authStorage.js',
  'services/auth.service.js',
  'services/api.js',
  'store/slices/authSlice.js',
  'components/common/AuthInitializer.jsx',
]

const JWT_STORAGE_PATTERN =
  /(localStorage|sessionStorage)\.(setItem|getItem)\(\s*['"`][^'"`]*(token|jwt|auth_token)/i

describe('browser JWT storage hygiene', () => {
  it('auth-related modules do not read/write JWTs in localStorage or sessionStorage', () => {
    for (const rel of AUTH_SOURCE_FILES) {
      const src = readFileSync(join(root, rel), 'utf8')
      expect(src).not.toMatch(JWT_STORAGE_PATTERN)
    }
  })

  it('authStorage only documents httpOnly cookies for credentials', () => {
    const src = readFileSync(join(root, 'utils/authStorage.js'), 'utf8')
    expect(src).toMatch(/httpOnly/)
    expect(src).toMatch(/auth_intent/)
  })
})
