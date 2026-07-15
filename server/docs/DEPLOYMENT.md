# Deployment & Database Migrations

## Overview

Production deployments must use **Prisma Migrate**, not `prisma db push`.

| Environment | Command |
|-------------|---------|
| Development | `npm run db:migrate` (`prisma migrate dev`) |
| CI / Production | `npm run db:migrate:deploy` (`prisma migrate deploy`) |

## Migration files

| Migration | Purpose |
|-----------|---------|
| `20250715170000_baseline` | Full schema baseline (includes RFQ Phase 2A/2B) |
| `20250715180000_rfq_production_hardening` | Idempotent upgrade for databases created via earlier `db push` |

### Fresh database (CI, new production)

```bash
cd server
npm run db:migrate:deploy
npm run db:seed        # non-production only
```

### Existing database (previously synced with `db push`)

1. Back up the database.
2. Mark baseline as applied if objects already exist:
   ```bash
   npx prisma migrate resolve --applied 20250715170000_baseline
   ```
3. Deploy remaining migrations:
   ```bash
   npm run db:migrate:deploy
   ```

## Render / production build

`npm run render:build` runs:

1. `prisma generate`
2. `prisma migrate deploy`
3. Catalog schema migration

## RFQ database constraints

- **`rfq_groups.rfq_number`** — globally unique (canonical RFQ number registry)
- **`quote_requests (rfq_group_id, seller_id)`** — unique per group (partial index where `seller_id IS NOT NULL`)
- **Indexes** — `buyer_id`, `seller_id`, `status`, `rfq_group_id`, `created_at`, composite `(buyer_id, status)`, `(seller_id, status)`

## Playwright CI

GitHub Actions:

1. Starts PostgreSQL service
2. Runs `db:ci:setup` (`migrate deploy` + seed)
3. Builds frontend
4. Playwright `webServer` starts backend → waits for `/api/health`
5. Playwright starts Vite → waits for frontend
6. Installs browsers (quality job) and runs tests
7. Uploads HTML report + artifacts

Local E2E:

```bash
cd server && npm run db:ci:setup
cd ../client && npm run test:e2e:ci
```

## Attachment storage

RFQ files are stored under `server/uploads/rfq/`. Downloads require authentication via `GET /api/quote-requests/attachments/file/:filename`.

Optional virus scanning hook: set `RFQ_VIRUS_SCAN_URL` when integrating external AV (fail-closed until wired).
