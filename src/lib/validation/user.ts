import { z } from "zod";
import { UserRole } from "@prisma/client";

const roleEnum = z.nativeEnum(UserRole);

const checkbox = z
  .union([z.literal("on"), z.literal(""), z.boolean()])
  .transform((v) => v === true || v === "on")
  .optional()
  .default(false);

const email = z
  .string()
  .trim()
  .min(1, "Email is required")
  .max(254)
  .email("Enter a valid email")
  .transform((v) => v.toLowerCase());

export const userCreateSchema = z.object({
  email,
  displayName: z.string().trim().min(1, "Name is required").max(120),
  role: roleEnum,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password is too long"),
});

// Optional Telegram chat id. Empty string clears it; otherwise must be a
// numeric (positive) user id or "-100…" group id.
const optionalTelegramChatId = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .refine(
    (v) => v === null || /^-?\d+$/.test(v),
    "Chat id must be a number (e.g. 123456789)",
  );

export const userUpdateSchema = z.object({
  displayName: z.string().trim().min(1, "Name is required").max(120),
  role: roleEnum,
  isActive: checkbox,
  telegramChatId: optionalTelegramChatId.optional().default(""),
});

export type UserCreateInput = z.input<typeof userCreateSchema>;
export type UserCreateData = z.output<typeof userCreateSchema>;
export type UserUpdateInput = z.input<typeof userUpdateSchema>;
export type UserUpdateData = z.output<typeof userUpdateSchema>;
