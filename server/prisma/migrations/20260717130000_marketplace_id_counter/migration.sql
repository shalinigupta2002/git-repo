-- Atomic counters for marketplace member ID generation

CREATE TABLE IF NOT EXISTS "marketplace_id_counters" (
  "type" VARCHAR(16) NOT NULL,
  "last_value" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "marketplace_id_counters_pkey" PRIMARY KEY ("type")
);
