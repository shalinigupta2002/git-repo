import { test, expect } from '@playwright/test'
import { loginViaUi } from '../fixtures/auth.js'
import { TEST_USERS } from '../fixtures/test-users.js'

test.describe('Buyer dashboard', () => {
  test('shows procurement metrics for subscribed buyer', async ({ page }) => {
    await loginViaUi(page, TEST_USERS.buyer)
    await page.goto('/buyer/dashboard')
    await expect(page.locator('.metricCard--purple .metricCard__label')).toHaveText('RFQs & quotations')
    await expect(page.locator('.metricCard').filter({ hasText: 'Active deals' }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /open quotation center/i })).toBeVisible()
  })
})

test.describe('Seller dashboard', () => {
  test('shows seller workspace metrics', async ({ page }) => {
    await loginViaUi(page, TEST_USERS.seller)
    await page.goto('/seller/dashboard')
    await expect(page.locator('.metricCard--amber .metricCard__label')).toHaveText('RFQs & quotations')
    await expect(page.locator('.metricCard').filter({ hasText: 'Open deals' }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /open quotation center/i })).toBeVisible()
  })
})

test.describe('Quotation centers', () => {
  test('buyer quotation inbox loads', async ({ page }) => {
    await loginViaUi(page, TEST_USERS.buyer)
    await page.goto('/buyer/quotations')
    await expect(page.getByRole('heading', { name: /RFQs & quotations/i, level: 1 })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Inbox', level: 2 })).toBeVisible()
  })

  test('seller quotation inbox loads', async ({ page }) => {
    await loginViaUi(page, TEST_USERS.seller)
    await page.goto('/seller/quotations')
    await expect(page.getByRole('heading', { name: /Incoming RFQs/i, level: 1 })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Inbox', level: 2 })).toBeVisible()
  })
})
