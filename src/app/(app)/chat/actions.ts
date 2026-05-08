"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth";
import {
  insertChatMessage,
  markMessagesRead,
  type ChatMessageRow,
} from "@/lib/services/chat";
import { broadcastChatMessage } from "@/lib/services/telegram";

const sendSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Type something before sending")
    .max(2000, "Message is too long"),
});

export type SendMessageResult =
  | { ok: true; message: ChatMessageRow }
  | { ok: false; error: string };

export async function sendChatMessageAction(
  body: string,
): Promise<SendMessageResult> {
  const user = await requireUser();
  const parsed = sendSchema.safeParse({ body });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid message",
    };
  }
  const message = await insertChatMessage(user.id, parsed.data.body);
  // Telegram fan-out is fire-and-forget — a failed broadcast must not
  // block the message, and the cashier already sees it locally.
  void broadcastChatMessage(user.displayName, parsed.data.body).catch(
    (err) => console.error("chat: telegram fanout failed", err),
  );
  return { ok: true, message };
}

export async function markChatReadAction(
  messageIds: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!Array.isArray(messageIds) || messageIds.length === 0) {
    return { ok: true };
  }
  const user = await requireUser();
  await markMessagesRead(user.id, messageIds.slice(0, 200));
  return { ok: true };
}
