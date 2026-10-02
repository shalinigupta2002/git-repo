# Production monitoring

## Health and uptime

- **Liveness / readiness:** `GET /api/health`
  - Returns `200` when the database responds to `SELECT 1`
  - Returns `503` with `status: "degraded"` when the database check fails
  - Includes request metrics snapshot (counts, latency percentiles, memory)

Configure your uptime provider (Better Stack, Pingdom, AWS Route 53 health checks, etc.) to poll:

```text
https://<your-api-host>/api/health
```

Alert when HTTP status is not `200` or when `data.database !== "ok"`.

## Error monitoring (optional Sentry)

Set on the API host:

```bash
SENTRY_DSN=https://<key>@o<org>.ingest.sentry.io/<project>
```

When configured:

- Unhandled `500` errors in `errorHandler.js` are reported to Sentry
- `data.monitoring` on `/api/health` returns `sentry_configured`

When not configured, monitoring falls back to structured logs (`pino` JSON in production).

## Logs

- Production logs are JSON lines via Pino
- Request ID: `req.id` from `requestLogger` middleware — correlate support tickets to log lines
- Sensitive fields (Authorization, cookies, passwords, Razorpay signatures) are redacted in `server/src/config/logger.js`

## Payment operations

- Log webhook outcomes at `info` / `warn` in `subscriptionWebhookController.js`
- Reconcile Razorpay Dashboard captures against `payments.status = 'PAID'` daily before launch

See also: [OPS_BACKUP_RESTORE.md](./OPS_BACKUP_RESTORE.md)
