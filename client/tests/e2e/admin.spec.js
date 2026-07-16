import { test, expect } from '@playwright/test'
import { TEST_USERS } from '../fixtures/test-users.js'

test.describe('Admin dashboard', () => {
  test('admin login page is reachable', async ({ page }) => {
    await page.goto('/admin/login')
    await expect(page.getByRole('heading', { name: /admin sign in/i })).toBeVisible()
  })

  test('admin overview loads for seeded admin user', async ({ page }) => {
    await page.goto('/admin/login')
    await page.getByPlaceholder('you@company.com').fill(TEST_USERS.admin.email)
    await page.getByPlaceholder('••••••••').fill(TEST_USERS.admin.password)
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.waitForURL(/\/admin/, { timeout: 20_000 })
    await expect(page.getByRole('navigation').first()).toBeVisible()
  })
})
