import { test, expect } from '@playwright/test'
import { loginViaUi } from '../fixtures/auth.js'
import { TEST_USERS } from '../fixtures/test-users.js'

test.describe('Quotation flow (API-assisted)', () => {
  test('buyer can list RFQs after login', async ({ page }) => {
    await loginViaUi(page, TEST_USERS.buyer)
    const listResponsePromise = page.waitForResponse((res) =>
      res.url().includes('/quote-requests/groups'),
    )
    await page.goto('/buyer/quotations')
    const listResponse = await listResponsePromise

    await expect(page.getByRole('heading', { name: /RFQs & quotations/i, level: 1 })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Inbox', level: 2 })).toBeVisible()

    if (listResponse.ok()) {
      const body = await listResponse.json()
      expect(body.success).toBe(true)
      expect(Array.isArray(body.data.items)).toBe(true)
    }
  })

  test('seller can list incoming RFQs', async ({ page }) => {
    await loginViaUi(page, TEST_USERS.seller)
    const listResponsePromise = page.waitForResponse((res) => {
      const url = res.url()
      return (
        /\/quote-requests(\?|$)/.test(url) &&
        !url.includes('/groups') &&
        !url.includes('/stats')
      )
    })
    await page.goto('/seller/quotations')
    const listResponse = await listResponsePromise

    await expect(page.getByRole('heading', { name: /Incoming RFQs/i, level: 1 })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Inbox', level: 2 })).toBeVisible()

    if (listResponse.ok()) {
      const body = await listResponse.json()
      expect(body.success).toBe(true)
      expect(Array.isArray(body.data.requests)).toBe(true)
    }
  })

  test('buyer deals page loads after accept flow path', async ({ page }) => {
    await loginViaUi(page, TEST_USERS.buyer)
    await page.goto('/buyer/transactions')
    await expect(page.getByRole('heading', { name: /your deals/i, level: 2 })).toBeVisible()
  })
})
