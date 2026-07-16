import { test, expect } from '@playwright/test'
import { loginViaUi } from '../fixtures/auth.js'
import { TEST_USERS } from '../fixtures/test-users.js'

test.describe('Quotation flow (API-assisted)', () => {
  test('buyer can list RFQs after login', async ({ page }) => {
    await loginViaUi(page, TEST_USERS.buyer)
    const res = await page.request.get('/api/quote-requests?viewAs=buyer')
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data.requests)).toBe(true)
  })

  test('seller can list incoming RFQs', async ({ page }) => {
    await loginViaUi(page, TEST_USERS.seller)
    const res = await page.request.get('/api/quote-requests?viewAs=seller')
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data.requests)).toBe(true)
  })

  test('buyer deals page loads after accept flow path', async ({ page }) => {
    await loginViaUi(page, TEST_USERS.buyer)
    await page.goto('/buyer/transactions')
    await expect(page.getByRole('heading', { name: /your deals/i })).toBeVisible()
  })
})
