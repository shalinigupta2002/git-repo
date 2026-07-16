import { test, expect } from '@playwright/test'

test.describe('Error pages', () => {
  test('unknown route redirects to home', async ({ page }) => {
    await page.goto('/this-route-does-not-exist-xyz')
    await expect(page).toHaveURL('/')
  })

  test('unauthorized page is reachable directly', async ({ page }) => {
    await page.goto('/unauthorized')
    await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible()
  })
})
