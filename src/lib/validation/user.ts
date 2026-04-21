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

export const userUpdateSchema = z.object({
  displayName: z.string().trim().min(1, "Name is required").max(120),
  role: roleEnum,
  isActive: checkbox,
});

export type UserCreateInput = z.input<typeof userCreateSchema>;
export type UserCreateData = z.output<typeof userCreateSchema>;
export type UserUpdateInput = z.input<typeof userUpdateSchema>;
export type UserUpdateData = z.output<typeof userUpdateSchema>;
