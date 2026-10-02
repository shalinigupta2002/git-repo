# Database backup and restore runbook

This document describes the minimum operational procedure before production launch. It does not replace your hosting provider’s own backup tools.

## Scope

- **Primary database:** PostgreSQL used by Prisma (`DATABASE_URL` / `DIRECT_URL`)
- **Catalog schema:** Optional `catalog` schema (see `server/src/db/migrate.js`)
- **Uploaded files:** Product/contact files on disk **and** rows in `uploaded_files` (BYTEA)

## Backup strategy (required before launch)

### Managed PostgreSQL (Neon, RDS, Render Postgres)

1. Enable **automated daily backups** in the provider console.
2. Record **retention period** (minimum 7 days recommended for launch; 30+ days for production).
3. Store the **connection strings** and backup restore instructions in your internal ops vault (not in git).

### Pre-migration manual snapshot

Before every production migration (`prisma migrate deploy`):

```bash
# Example: Neon — create a branch or use provider snapshot UI
# Example: RDS — create manual snapshot in AWS Console
```

Document snapshot ID and timestamp in your change ticket.

## Restore procedure (drill quarterly)

1. Provision a **new empty** database instance (or Neon branch).
2. Restore provider backup to that instance.
3. Update **staging** `DATABASE_URL` and `DIRECT_URL` to point at restored DB.
4. Run verification:

```bash
cd server
npm run db:generate
npx prisma migrate status
npm run test:api -- tests/api/health.test.js
```

5. Smoke-test: login, subscription status, one RFQ read, one product list.

6. Only after validation, plan cutover to production DNS (if disaster recovery).

## Payment consistency recovery

If Razorpay shows **captured** but the app shows **PENDING** subscription:

1. Locate `payments.razorpay_order_id` for the user/plan.
2. Confirm event in Razorpay Dashboard → Webhooks (after launch, webhook should auto-heal).
3. Manual recovery (support/admin):
   - Re-send webhook from Razorpay dashboard **or**
   - User opens payment success flow to hit `POST /api/subscriptions/verify` **or**
   - Support runs internal script to call `fulfillSubscriptionPayment` with verified IDs (never run without signature verification).

4. Document incident in audit log.

## What not to run in production

- `npm run db:reset`
- `npm run db:ci:setup` (drops data via seed reset)
- `prisma db push` (use `migrate deploy` only)

## File / image recovery

- Disk uploads on PaaS may be **ephemeral**; production relies on `uploaded_files` table.
- For AWS migration, plan **S3** as primary blob store; keep DB metadata only.

## Contacts

- **DBA / infra owner:** _fill before launch_
- **On-call engineer:** _fill before launch_
- **Razorpay support:** dashboard support channel

## Checklist before go-live

- [ ] Automated backups enabled and retention documented
- [ ] Restore drill completed to staging in last 90 days
- [ ] Migration snapshot process documented in release checklist
- [ ] Payment reconciliation runbook shared with support team
