import { test, expect } from '@playwright/test'

test.describe('Smoke — public marketing shell', () => {
  test('homepage loads with hero and pricing CTA', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /procurement and quotations/i })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('button', { name: /view plans/i }).first()).toBeVisible({ timeout: 30_000 })
  })

  test('pricing page renders plan tabs', async ({ page }) => {
    await page.goto('/pricing')
    await expect(page.getByRole('heading', { name: /choose your plan/i })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('tab', { name: /^Buyer$/i })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('tab', { name: /^Seller$/i })).toBeVisible({ timeout: 30_000 })
  })

  test('products page loads catalog grid or empty state', async ({ page }) => {
    await page.goto('/products')
    await expect(page.locator('.mpShell').first()).toBeVisible({ timeout: 30_000 })
  })

  test('health API responds ok', async ({ request }) => {
    const res = await request.get('http://127.0.0.1:3001/api/health')
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.status).toBe('ok')
  })
})
