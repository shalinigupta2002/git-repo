import { test, expect } from '@playwright/test'
import { loginViaUi } from '../fixtures/auth.js'
import { TEST_USERS } from '../fixtures/test-users.js'

test.describe('Regression — end-to-end marketplace journeys', () => {
  test('guest browse → product detail → login redirect for dashboard', async ({ page }) => {
    await page.goto('/products')
    await page.waitForLoadState('networkidle')
    const cardLink = page.locator('.mpCard__link').first()
    if (await cardLink.count()) {
      await cardLink.click()
      await expect(page).toHaveURL(/\/products\//)
    }
    await page.goto('/buyer/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('buyer session persists across quotation and deals pages', async ({ page }) => {
    await loginViaUi(page, TEST_USERS.buyer)
    await page.goto('/buyer/quotations')
    await expect(page.getByRole('heading', { name: /RFQs & quotations/i })).toBeVisible()
    await page.goto('/buyer/transactions')
    await expect(page.getByRole('heading', { name: /your deals/i })).toBeVisible()
  })

  test('seller can access products and quotations workspaces', async ({ page }) => {
    await loginViaUi(page, TEST_USERS.seller)
    await page.goto('/seller/products')
    await expect(page.getByRole('heading').first()).toBeVisible()
    await page.goto('/seller/quotations')
    await expect(page.getByRole('heading', { name: /Incoming RFQs/i })).toBeVisible()
  })

  test('catalog API returns masked seller identity', async ({ request }) => {
    const res = await request.get('/api/catalog/products?limit=5')
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    const product = body.data?.products?.[0]
    if (product?.seller) {
      expect(product.seller).toHaveProperty('id')
      expect(product.seller).toHaveProperty('city')
      expect(product.seller.email).toBeUndefined()
      expect(product.seller.companyName).toBeUndefined()
    }
  })
})
