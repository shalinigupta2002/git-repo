import { test, expect } from '@playwright/test'
import { TEST_USERS } from '../fixtures/test-users.js'

test.describe('Admin dashboard', () => {
  test('admin login page is reachable', async ({ page }) => {
    await page.goto('/admin/login')
    await expect(page.getByRole('heading', { name: /admin login/i })).toBeVisible()
  })

  test('admin overview loads for seeded admin user', async ({ page }) => {
    await page.goto('/admin/login')
    await page.getByPlaceholder('admin@b2b.local').fill(TEST_USERS.admin.email)
    await page.getByPlaceholder('••••••••').fill(TEST_USERS.admin.password)
    await page.getByRole('button', { name: 'Login' }).click()
    await page.waitForURL(
      (url) => url.pathname.startsWith('/admin') && !url.pathname.includes('/login'),
      { timeout: 20_000 },
    )
    await expect(page.getByRole('navigation', { name: 'Admin' })).toBeVisible()
    await expect(page.getByRole('heading', { name: /overview dashboard/i })).toBeVisible()
  })
})
