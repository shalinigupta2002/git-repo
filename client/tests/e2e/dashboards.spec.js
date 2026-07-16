import { test, expect } from '@playwright/test'
import { loginViaUi } from '../fixtures/auth.js'
import { TEST_USERS } from '../fixtures/test-users.js'

test.describe('Buyer dashboard', () => {
  test('shows procurement metrics for subscribed buyer', async ({ page }) => {
    await loginViaUi(page, TEST_USERS.buyer)
    await page.goto('/buyer/dashboard')
    await expect(page.getByText('RFQs & quotations')).toBeVisible()
    await expect(page.getByText('Active deals')).toBeVisible()
    await expect(page.getByRole('link', { name: /quotation center/i })).toBeVisible()
  })
})

test.describe('Seller dashboard', () => {
  test('shows seller workspace metrics', async ({ page }) => {
    await loginViaUi(page, TEST_USERS.seller)
    await page.goto('/seller/dashboard')
    await expect(page.getByText('RFQs & quotations')).toBeVisible()
    await expect(page.getByText('Open deals')).toBeVisible()
    await expect(page.getByRole('link', { name: /quotation center/i })).toBeVisible()
  })
})

test.describe('Quotation centers', () => {
  test('buyer quotation inbox loads', async ({ page }) => {
    await loginViaUi(page, TEST_USERS.buyer)
    await page.goto('/buyer/quotations')
    await expect(page.getByRole('heading', { name: /RFQs & quotations/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible()
  })

  test('seller quotation inbox loads', async ({ page }) => {
    await loginViaUi(page, TEST_USERS.seller)
    await page.goto('/seller/quotations')
    await expect(page.getByRole('heading', { name: /Incoming RFQs/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible()
  })
})
