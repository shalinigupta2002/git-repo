import { test, expect } from '@playwright/test'

const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
]

for (const vp of viewports) {
  test.describe(`Responsive — ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } })

    test('homepage remains usable', async ({ page }) => {
      await page.goto('/')
      await expect(page.getByRole('heading', { name: /procurement and quotations/i })).toBeVisible()
    })

    test('products page remains usable', async ({ page }) => {
      await page.goto('/products')
      await expect(page.getByRole('link', { name: /Bold and Wise/i })).toBeVisible()
      await expect(page.locator('.mpShell')).toBeVisible()
    })
  })
}
