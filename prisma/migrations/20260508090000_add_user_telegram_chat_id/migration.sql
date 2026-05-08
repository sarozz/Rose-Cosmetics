-- Senior staff (Owner/Manager) can opt in to replying to team chat from
-- Telegram. The webhook resolves an inbound message's chat id back to a
-- User by this column.
ALTER TABLE "users"
  ADD COLUMN "telegram_chat_id" TEXT;

CREATE UNIQUE INDEX "users_telegram_chat_id_key"
  ON "users" ("telegram_chat_id");
