import { z } from "zod";
import { OnlineOrderStatus, OnlineSalesChannel } from "@prisma/client";

const empty = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v));

const price = z.coerce
  .number({ invalid_type_error: "Enter a number" })
  .nonnegative("Must be zero or more")
  .multipleOf(0.01, "At most two decimals");

const positiveInt = z.coerce
  .number({ invalid_type_error: "Enter a whole number" })
  .int("Must be a whole number")
  .positive("Must be at least 1");

const itemSchema = z.object({
  productId: z.string().cuid("Select a product"),
  qty: positiveInt,
  unitPrice: price,
});

export const onlineOrderCreateSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(1, "Customer name is required")
    .max(120, "Name is too long"),
  customerPhone: empty.pipe(z.string().max(40).nullable()),
  customerAddress: z
    .string()
    .trim()
    .min(5, "Delivery address is required")
    .max(500, "Address is too long"),
  note: empty.pipe(z.string().max(2000).nullable()),
  channel: z.nativeEnum(OnlineSalesChannel).default("INSTAGRAM"),
  discount: price.optional().default(0),
  items: z
    .array(itemSchema)
    .min(1, "Add at least one product")
    .refine(
      (items) => new Set(items.map((i) => i.productId)).size === items.length,
      { message: "Each product can only appear once per order" },
    ),
});

export const onlineStatusUpdateSchema = z.object({
  status: z.nativeEnum(OnlineOrderStatus),
  note: empty.pipe(z.string().max(500).nullable()),
});

export type OnlineOrderCreateInput = z.input<typeof onlineOrderCreateSchema>;
export type OnlineOrderCreateData = z.output<typeof onlineOrderCreateSchema>;
export type OnlineStatusUpdateData = z.output<typeof onlineStatusUpdateSchema>;
