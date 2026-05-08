import { NextResponse, type NextRequest } from "next/server";
import {
  findUserByTelegramChatId,
  insertChatMessage,
} from "@/lib/services/chat";
import {
  broadcastChatMessage,
  sendTelegramMessage,
} from "@/lib/services/telegram";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Telegram → Team chat bridge.
 *
 * When senior staff replies to the bot from their phone, Telegram POSTs
 * an Update here. We:
 *   1. Verify the secret-token header so randoms can't spoof messages.
 *   2. Resolve the sender's chat id to a User via users.telegram_chat_id.
 *      If unknown, silently 200 — never echo untrusted strangers into the
 *      team chat.
 *   3. Insert a ChatMessage as that user. The dock's Realtime
 *      subscription / polling fallback picks it up and renders it for
 *      every other open tab.
 *   4. Re-broadcast the message to every other Telegram recipient
 *      (excludeChatId skips the sender so they don't get their own
 *      message echoed back).
 *
 * We always return 200 — even on errors — so Telegram doesn't queue up
 * a retry storm. The cost of a lost message is one missed line in the
 * team chat; the cost of a retry storm is a flood of duplicates.
 */
export async function POST(req: NextRequest) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected) {
    console.error("telegram webhook: TELEGRAM_WEBHOOK_SECRET not configured");
    // Still return 200 so Telegram doesn't retry — but this is a config bug.
    return NextResponse.json({ ok: true });
  }
  const got = req.headers.get("x-telegram-bot-api-secret-token");
  if (got !== expected) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }

  // Only handle plain text messages from private chats. Edits, channel
  // posts, callbacks, and group chats are ignored for now.
  const message = update.message;
  if (!message || !message.text || !message.from || !message.chat) {
    return NextResponse.json({ ok: true });
  }
  if (message.chat.type !== "private") {
    return NextResponse.json({ ok: true });
  }

  const chatId = String(message.chat.id);
  const text = message.text.trim();
  if (!text) return NextResponse.json({ ok: true });

  // /start handshake — useful so a new staff member can find their chat
  // id and send it to the owner without leaving Telegram.
  if (text === "/start") {
    void sendTelegramMessage(
      chatId,
      `\u{1F44B} <b>Rose Cosmetics</b> bot.\nYour chat id is <code>${escapeHtml(chatId)}</code>. Ask the owner to link it to your staff account so you can reply to team chat from here.`,
    ).catch(() => {});
    return NextResponse.json({ ok: true });
  }

  const user = await findUserByTelegramChatId(chatId);
  if (!user) {
    // Unknown sender — silently drop. We don't reply because that would
    // confirm the bot's existence to anyone who happens to message it.
    console.warn("telegram webhook: unknown chat id", chatId);
    return NextResponse.json({ ok: true });
  }

  try {
    await insertChatMessage(user.id, text);
  } catch (err) {
    console.error("telegram webhook: insert failed", err);
    return NextResponse.json({ ok: true });
  }

  // Re-broadcast to every other recipient. Fire-and-forget — Telegram
  // doesn't care how long fan-out takes, and we already saved the row.
  void broadcastChatMessage(user.displayName, text, {
    excludeChatId: chatId,
  }).catch((err) => {
    console.error("telegram webhook: rebroadcast failed", err);
  });

  return NextResponse.json({ ok: true });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Subset of Telegram's Update type — only what we use. Full schema:
// https://core.telegram.org/bots/api#update
type TelegramUpdate = {
  update_id?: number;
  message?: {
    message_id?: number;
    text?: string;
    from?: { id: number };
    chat?: { id: number; type: "private" | "group" | "supergroup" | "channel" };
  };
};
