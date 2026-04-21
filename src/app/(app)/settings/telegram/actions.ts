"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole, STAFF_WRITE_ROLES } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { telegramRecipientSchema } from "@/lib/validation/telegram";
import {
  sendTelegramMessage,
  isTelegramConfigured,
} from "@/lib/services/telegram";
import type { TelegramFormState } from "./state";

function parse(formData: FormData) {
  return telegramRecipientSchema.safeParse({
    name: formData.get("name") ?? "",
    chatId: formData.get("chatId") ?? "",
    enabled: formData.get("enabled") === "on",
    notifySales: formData.get("notifySales") === "on",
    notifyStockReceipts: formData.get("notifyStockReceipts") === "on",
  });
}

export async function createRecipientAction(
  _prev: TelegramFormState,
  formData: FormData,
): Promise<TelegramFormState> {
  await requireRole(STAFF_WRITE_ROLES);
  const parsed = parse(formData);
  if (!parsed.success) {
    return {
      fieldErrors: toFieldErrors(parsed.error.flatten().fieldErrors),
      formError: "Please fix the highlighted fields.",
    };
  }
  try {
    await prisma.telegramRecipient.create({ data: parsed.data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("P2002")) {
      return {
        fieldErrors: { chatId: "A recipient with this chat ID already exists." },
        formError: null,
      };
    }
    return { fieldErrors: {}, formError: "Something went wrong. Try again." };
  }
  revalidatePath("/settings/telegram");
  redirect("/settings/telegram");
}

export async function updateRecipientAction(
  id: string,
  _prev: TelegramFormState,
  formData: FormData,
): Promise<TelegramFormState> {
  await requireRole(STAFF_WRITE_ROLES);
  const parsed = parse(formData);
  if (!parsed.success) {
    return {
      fieldErrors: toFieldErrors(parsed.error.flatten().fieldErrors),
      formError: "Please fix the highlighted fields.",
    };
  }
  try {
    await prisma.telegramRecipient.update({ where: { id }, data: parsed.data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("P2002")) {
      return {
        fieldErrors: { chatId: "A recipient with this chat ID already exists." },
        formError: null,
      };
    }
    return { fieldErrors: {}, formError: "Something went wrong. Try again." };
  }
  revalidatePath("/settings/telegram");
  redirect("/settings/telegram");
}

export async function deleteRecipientAction(formData: FormData): Promise<void> {
  await requireRole(STAFF_WRITE_ROLES);
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.telegramRecipient.delete({ where: { id } });
  revalidatePath("/settings/telegram");
}

/**
 * Fire a test message to one recipient — useful right after the owner
 * pastes a chat ID so they can confirm the bot actually reaches them.
 */
export async function testRecipientAction(
  formData: FormData,
): Promise<{ ok: boolean; message: string }> {
  await requireRole(STAFF_WRITE_ROLES);
  if (!isTelegramConfigured()) {
    return {
      ok: false,
      message: "TELEGRAM_BOT_TOKEN is not set — ask the deploy owner to add it.",
    };
  }
  const id = String(formData.get("id") ?? "");
  const recipient = await prisma.telegramRecipient.findUnique({ where: { id } });
  if (!recipient) return { ok: false, message: "Recipient not found" };
  const result = await sendTelegramMessage(
    recipient.chatId,
    "✅ Rose Cosmetics test message — your chat is wired up correctly.",
  );
  if (result.ok) return { ok: true, message: "Test message sent." };
  return { ok: false, message: `Failed: ${result.error}` };
}

function toFieldErrors(
  fieldErrors: Record<string, string[] | undefined>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, msgs] of Object.entries(fieldErrors)) {
    if (msgs && msgs.length > 0) out[key] = msgs[0];
  }
  return out;
}
