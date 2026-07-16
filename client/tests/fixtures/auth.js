import { TEST_USERS } from './test-users.js'

/**
 * Sign in through the UI and wait for post-login navigation.
 * Requires a running API with seeded demo users (see server/prisma/seed.js).
 */
export async function loginViaUi(page, { email, password } = TEST_USERS.buyer) {
  await page.goto('/login')
  await page.getByPlaceholder('you@company.com').fill(email)
  await page.getByPlaceholder('••••••••').fill(password)
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.waitForURL(/\/(buyer|seller|portal|admin)/, { timeout: 20_000 })
}

export async function logoutViaApi(request) {
  await request.post('/api/auth/logout')
}
