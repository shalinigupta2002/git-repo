import { test, expect } from '@playwright/test'
import { loginViaUi } from '../fixtures/auth.js'
import { TEST_USERS } from '../fixtures/test-users.js'

test.describe('RFQ marketing surfaces', () => {
  test('products page exposes RFQ entry points', async ({ page }) => {
    await page.goto('/products')
    await expect(page.getByRole('link', { name: /product/i }).first()).toBeVisible()
    await expect(page.getByLabel('Open quotations')).toBeVisible()
  })

  test('buyer quotations route renders workspace shell', async ({ page }) => {
    await loginViaUi(page, TEST_USERS.buyer)
    await page.goto('/buyer/quotations')
    await expect(page.getByRole('heading', { name: /RFQs & quotations/i, level: 1 })).toBeVisible()
    await expect(page.getByTestId('quotation-workspace')).toBeVisible()
    await expect(page.getByTestId('quotation-workspace-list')).toBeVisible()
    await expect(page.getByLabel('Status filter')).toBeVisible()
  })
})
