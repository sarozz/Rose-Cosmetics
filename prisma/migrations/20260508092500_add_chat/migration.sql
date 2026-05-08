-- Team chat: shared room for all users.
-- Real-time updates flow through Supabase Realtime publication
-- `supabase_realtime` (added in a separate manual step in the SQL Editor —
-- see PR description).

-- 1. Telegram fan-out flag for the new chat broadcast surface.
ALTER TABLE "telegram_recipients"
  ADD COLUMN "notifyChat" BOOLEAN NOT NULL DEFAULT true;

-- 2. Chat messages.
CREATE TABLE "chat_messages" (
  "id" TEXT NOT NULL,
  "author_id" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "chat_messages_created_at_idx" ON "chat_messages" ("created_at");

ALTER TABLE "chat_messages"
  ADD CONSTRAINT "chat_messages_author_id_fkey"
  FOREIGN KEY ("author_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3. Per-user read receipts (composite PK so each user reads each message
-- at most once).
CREATE TABLE "chat_reads" (
  "message_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chat_reads_pkey" PRIMARY KEY ("message_id", "user_id")
);

CREATE INDEX "chat_reads_user_id_read_at_idx" ON "chat_reads" ("user_id", "read_at");

ALTER TABLE "chat_reads"
  ADD CONSTRAINT "chat_reads_message_id_fkey"
  FOREIGN KEY ("message_id") REFERENCES "chat_messages" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_reads"
  ADD CONSTRAINT "chat_reads_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
