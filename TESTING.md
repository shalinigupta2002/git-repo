# Testing Guide — B2B Marketplace

This repository contains two separate applications:

| App | Path | Stack |
|-----|------|-------|
| Frontend | `client/` | React + Vite + Vitest + Playwright |
| Backend | `server/` | Express + Prisma + Jest + Supertest |

Business logic is **not** modified by the test infrastructure. Tests validate existing behaviour only.

---

## Prerequisites

- **Node.js 22.x**
- **PostgreSQL** (required for Playwright E2E and optional integration runs)
- Demo seed data (`server/prisma/seed.js`) for authenticated E2E flows

---

## Quick start (from repo root)

```bash
npm ci --prefix server
npm ci --prefix client
cd client && npx playwright install --with-deps && cd ..

cd server
npm run db:ci:setup
cd ..

npm run test:ci
```

---

## Backend tests (Jest + Supertest)

```
server/src/__tests__/     # legacy integration tests
server/tests/api/         # API route tests
server/tests/integration/ # catalog integration
server/tests/security/    # authz + validation
```

```bash
cd server
npm test
npm run test:api
npm run test:integration
npm run test:security
npm run test:coverage
npm run lint
```

ESLint is scoped to **test infrastructure files** (`tests/`, `src/__tests__/`, config files) so existing application source is not modified to satisfy lint rules.

---

## Frontend unit tests (Vitest)

```bash
cd client
npm test
npm run test:coverage
npm run lint
```

---

## Playwright E2E

```
client/tests/smoke/
client/tests/regression/
client/tests/e2e/
client/tests/fixtures/
```

Config: `client/playwright.config.js`

Features: Chromium, Firefox, WebKit · retries in CI · trace on retry · screenshots/video on failure · HTML report.

```bash
cd client
npm run test:smoke
npm run test:regression
npm run test:e2e
npm run test:e2e:ci
npx playwright show-report
```

### Seeded credentials (`server/prisma/seed.js`)

| Role | Email | Password |
|------|-------|----------|
| Buyer | `buyer.subscribed@buyer.test` | `buyer123` |
| Seller | `alpha@seller.test` | `seller123` |
| Admin | `admin@b2b.local` | `admin123` |

---

## CI (GitHub Actions)

Workflow: `.github/workflows/ci.yml`

On every push/PR: lint → `migrate deploy` + seed → build → Jest → Vitest → Playwright (auto-starts API + Vite via `webServer`) → upload coverage + HTML reports.

---

## Manual tests still required

- Razorpay payment verification with real keys
- File uploads (product images, contact attachments)
- Production cross-origin cookie behaviour (Vercel + Render)
- Load/stress testing
- Full WCAG accessibility audit
