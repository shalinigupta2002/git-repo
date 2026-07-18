-- Threaded replies for Contact Admin support tickets
CREATE TABLE "contact_message_replies" (
    "id" TEXT NOT NULL,
    "contact_message_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "body" VARCHAR(5000) NOT NULL,
    "attachments" JSONB DEFAULT '[]',
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_message_replies_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "contact_message_replies_contact_message_id_created_at_idx"
ON "contact_message_replies"("contact_message_id", "created_at");

ALTER TABLE "contact_message_replies"
ADD CONSTRAINT "contact_message_replies_contact_message_id_fkey"
FOREIGN KEY ("contact_message_id") REFERENCES "contact_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "contact_message_replies"
ADD CONSTRAINT "contact_message_replies_author_id_fkey"
FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
