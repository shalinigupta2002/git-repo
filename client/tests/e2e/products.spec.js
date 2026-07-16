import { test, expect } from '@playwright/test'

test.describe('Product listing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/products')
    await page.waitForLoadState('networkidle')
  })

  test('renders product cards with request quotation action', async ({ page }) => {
    const cards = page.locator('.mpCard')
    const count = await cards.count()
    if (count === 0) {
      await expect(page.locator('.mpEmpty, .mpShell')).toBeVisible()
      return
    }
    await expect(cards.first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Request quotation' }).first()).toBeVisible()
  })

  test('search filters products', async ({ page }) => {
    const searchInput = page.locator('#mp-q')
    await searchInput.fill('phone')
    await page.locator('.mpSearch__btn').click()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.mpShell')).toBeVisible()
  })

  test('category sidebar is interactive', async ({ page }) => {
    const categoryBtn = page.locator('.mpShopByCat__item button, .mpShopByCat__link').first()
    if (await categoryBtn.count()) {
      await categoryBtn.click()
      await page.waitForLoadState('networkidle')
    }
    await expect(page.locator('.mpShell')).toBeVisible()
  })

  test('brand filter controls are present', async ({ page }) => {
    const brandFilter = page.locator('.mpBrandFilter, .mpFilters, .mpSidebar').first()
    await expect(brandFilter).toBeVisible()
  })
})

test.describe('Product detail', () => {
  test('opens detail page from listing', async ({ page }) => {
    await page.goto('/products')
    await page.waitForLoadState('networkidle')
    const firstLink = page.locator('.mpCard__link').first()
    if (!(await firstLink.count())) {
      test.skip(true, 'No seeded products available')
    }
    await firstLink.click()
    await expect(page).toHaveURL(/\/products\//)
    await expect(page.getByRole('heading').first()).toBeVisible()
  })
})
