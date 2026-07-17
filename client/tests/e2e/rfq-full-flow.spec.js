import { test, expect } from '@playwright/test'
import { loginViaUi } from '../fixtures/auth.js'
import { TEST_USERS } from '../fixtures/test-users.js'

test.describe('RFQ full flow', () => {
  test('buyer creates RFQ, seller responds, buyer accepts, deal appears', async ({ page, browser }) => {
    test.setTimeout(120_000)

    const unique = Date.now()
    const requirement = `Automation RFQ requirement ${unique}`

    await loginViaUi(page, TEST_USERS.buyer)

    const catalogRes = await page.request.get('/api/catalog/products?limit=1')
    expect(catalogRes.ok()).toBeTruthy()
    const catalogBody = await catalogRes.json()
    const product = catalogBody.data?.products?.[0]
    expect(product?.id).toBeTruthy()

    const createRes = await page.request.post('/api/quote-requests', {
      data: {
        productTitle: product.title,
        productId: product.id,
        quantity: Math.max(Number(product.moq) || 1, 1),
        message: requirement,
        deliveryLocation: 'Mumbai, Maharashtra',
        expectedDeliveryDate: '2026-12-31',
      },
    })
    expect(createRes.ok(), await createRes.text()).toBeTruthy()
    const createBody = await createRes.json()
    const requestId = createBody.data?.request?.id || createBody.data?.group?.requests?.[0]?.id
    expect(requestId).toBeTruthy()

    await page.goto(`/buyer/quotations/${requestId}`)
    await expect(page.getByText(requirement).first()).toBeVisible({ timeout: 30_000 })

    const sellerContext = await browser.newContext()
    const sellerPage = await sellerContext.newPage()
    await loginViaUi(sellerPage, TEST_USERS.seller)
    await sellerPage.goto(`/seller/quotations/${requestId}`)
    await expect(sellerPage.getByText(requirement).first()).toBeVisible({ timeout: 30_000 })

    await sellerPage.getByLabel(/final unit price/i).fill('250')
    const respondPromise = sellerPage.waitForResponse(
      (res) => /\/quote-requests\/.+\/respond$/.test(res.url()) && res.request().method() === 'PATCH',
    )
    await sellerPage.getByRole('button', { name: /send quotation|update quotation/i }).click()
    const respondRes = await respondPromise
    expect(respondRes.ok(), await respondRes.text()).toBeTruthy()

    await page.reload()
    await expect(page.getByRole('button', { name: /accept quotation/i })).toBeVisible({ timeout: 30_000 })

    const acceptPromise = page.waitForResponse(
      (res) => /\/quote-requests\/.+\/accept$/.test(res.url()) && res.request().method() === 'PATCH',
    )
    await page.getByRole('button', { name: /accept quotation/i }).click()
    const acceptRes = await acceptPromise
    expect(acceptRes.ok(), await acceptRes.text()).toBeTruthy()

    await page.goto('/buyer/transactions')
    await expect(page.getByRole('heading', { name: /your deals/i, level: 2 })).toBeVisible()

    await sellerContext.close()
  })
})
