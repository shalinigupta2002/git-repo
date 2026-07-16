import { test, expect } from '@playwright/test'

test.describe('RFQ marketing surfaces', () => {
  test('products page exposes RFQ entry points', async ({ page }) => {
    await page.goto('/products')
    await expect(page.getByRole('link', { name: /product/i }).first()).toBeVisible()
    await expect(page.getByLabel('Open quotations')).toBeVisible()
  })

  test('buyer quotations route renders workspace shell', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('buyer.subscribed@buyer.test')
    await page.getByLabel(/password/i).fill('buyer123')
    await page.getByRole('button', { name: /sign in|log in/i }).click()
    await page.goto('/buyer/quotations')
    await expect(page.getByRole('heading', { name: /RFQs & quotations/i })).toBeVisible()
    await expect(page.getByRole('tablist', { name: /Filter quotations/i })).toBeVisible()
  })
})
