-- Persist uploaded product images in PostgreSQL for production (Render ephemeral disk).
CREATE TABLE "uploaded_files" (
    "key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uploaded_files_pkey" PRIMARY KEY ("key")
);
