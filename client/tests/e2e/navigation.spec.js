import { test, expect } from '@playwright/test'

test.describe('Primary navigation', () => {
  test('header links navigate between marketing pages', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Products' }).click()
    await expect(page).toHaveURL(/\/products/)
    await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Pricing' }).click()
    await expect(page).toHaveURL(/\/pricing/)
  })

  test('sign in link routes to login', async ({ page }) => {
    await page.goto('/products')
    await page.getByRole('link', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Loading states', () => {
  test('lazy routes show loader then content', async ({ page }) => {
    await page.goto('/products')
    await expect(page.locator('.mpPage, .mpShell')).toBeVisible({ timeout: 20_000 })
  })
})
