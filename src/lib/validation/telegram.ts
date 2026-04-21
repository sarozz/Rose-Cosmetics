import { z } from "zod";

export const telegramRecipientSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(80, "Name is too long"),
  // Telegram chat IDs are integers for users and negative integers for
  // groups/channels. Accept either as long as it parses as an integer string.
  chatId: z
    .string()
    .trim()
    .regex(/^-?\d+$/, "Chat ID must be a number (e.g. 123456789 or -1001234567890)"),
  enabled: z.boolean().default(true),
  notifySales: z.boolean().default(true),
  notifyStockReceipts: z.boolean().default(true),
});

export type TelegramRecipientInput = z.input<typeof telegramRecipientSchema>;
export type TelegramRecipientData = z.output<typeof telegramRecipientSchema>;
