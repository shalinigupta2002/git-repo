import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig, devices } from '@playwright/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Use CI Postgres when set; otherwise fall back to server/.env for local E2E runs. */
function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  try {
    const envPath = path.resolve(__dirname, '../server/.env')
    const content = fs.readFileSync(envPath, 'utf8')
    const match = content.match(/^DATABASE_URL=(.+)$/m)
    if (match) return match[1].replace(/^["']|["']$/g, '').trim()
  } catch {
    /* local server/.env optional */
  }
  return 'postgresql://test:test@127.0.0.1:5432/test_db'
}

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173'
const apiURL = process.env.PLAYWRIGHT_API_URL || 'http://127.0.0.1:3001'
const databaseUrl = resolveDatabaseUrl()

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI
    ? [
        ['html', { open: 'never', outputFolder: 'playwright-report' }],
        ['github'],
        ['list'],
      ]
    : [
        ['html', { open: 'on-failure', outputFolder: 'playwright-report' }],
        ['list'],
      ],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'smoke-chromium',
      testMatch: /smoke\/.*\.spec\.js/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'regression-chromium',
      testMatch: /regression\/.*\.spec\.js/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium',
      testMatch: /e2e\/.*\.spec\.js/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      testMatch: /e2e\/.*\.spec\.js/,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testMatch: /e2e\/.*\.spec\.js/,
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : [
        {
          command: 'npm run start:ci',
          cwd: '../server',
          url: `${apiURL}/api/health`,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          env: {
            NODE_ENV: 'test',
            PORT: '3001',
            DATABASE_URL: databaseUrl,
            JWT_SECRET: process.env.JWT_SECRET || 'test-jwt-secret-at-least-32-characters-long!',
            CLIENT_URL: 'http://127.0.0.1:5173',
            RAZORPAY_KEY_ID: 'rzp_test_TESTID',
            RAZORPAY_KEY_SECRET: 'test_secret_TESTKEY',
          },
        },
        {
          command: 'npm run dev -- --host 127.0.0.1 --port 5173',
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          env: {
            VITE_BACKEND_URL: apiURL,
          },
        },
      ],
})
