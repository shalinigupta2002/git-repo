-- RFQ MVP: CANCELLED status, revision history, notification events

ALTER TYPE "QuoteRequestStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

ALTER TABLE "quote_requests"
  ADD COLUMN IF NOT EXISTS "buyer_cancelled_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "revision_count" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "quote_revisions" (
  "id" TEXT NOT NULL,
  "quote_request_id" TEXT NOT NULL,
  "revision_number" INTEGER NOT NULL,
  "seller_unit_price" DECIMAL(12,2) NOT NULL,
  "seller_currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
  "tax_note" VARCHAR(500),
  "quote_valid_until" TIMESTAMP(3),
  "freight_note" VARCHAR(1000),
  "exclusions_note" VARCHAR(1000),
  "created_by_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "quote_revisions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "quote_revisions_quote_request_id_revision_number_key"
  ON "quote_revisions"("quote_request_id", "revision_number");
CREATE INDEX IF NOT EXISTS "quote_revisions_quote_request_id_idx"
  ON "quote_revisions"("quote_request_id");

ALTER TABLE "quote_revisions"
  ADD CONSTRAINT "quote_revisions_quote_request_id_fkey"
  FOREIGN KEY ("quote_request_id") REFERENCES "quote_requests"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "rfq_notification_events" (
  "id" TEXT NOT NULL,
  "recipient_user_id" TEXT NOT NULL,
  "quote_request_id" TEXT,
  "rfq_group_id" UUID,
  "event_type" VARCHAR(64) NOT NULL,
  "payload" JSONB,
  "read_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rfq_notification_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "rfq_notification_events_recipient_user_id_read_at_idx"
  ON "rfq_notification_events"("recipient_user_id", "read_at");
CREATE INDEX IF NOT EXISTS "rfq_notification_events_recipient_user_id_created_at_idx"
  ON "rfq_notification_events"("recipient_user_id", "created_at");

ALTER TABLE "rfq_notification_events"
  ADD CONSTRAINT "rfq_notification_events_recipient_user_id_fkey"
  FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
