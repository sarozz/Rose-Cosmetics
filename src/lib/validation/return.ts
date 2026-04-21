import { z } from "zod";

const empty = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v));

const money = z.coerce
  .number({ invalid_type_error: "Enter a number" })
  .nonnegative("Must be zero or more")
  .multipleOf(0.01, "At most two decimals");

const positiveInt = z.coerce
  .number({ invalid_type_error: "Enter a whole number" })
  .int("Must be a whole number")
  .positive("Must be at least 1");

const returnItemSchema = z.object({
  saleItemId: z.string().cuid("Invalid sale line"),
  qty: positiveInt,
  refundAmount: money,
  // Box unchecked means the unit was damaged / non-resalable, so no
  // RETURN_IN ledger row + no stock increment (blueprint §13).
  restockFlag: z.coerce.boolean().default(true),
});

export const returnSchema = z.object({
  originalSaleId: z.string().cuid("Invalid sale"),
  reasonNote: empty.pipe(z.string().max(500).nullable()),
  items: z
    .array(returnItemSchema)
    .min(1, "Pick at least one line to refund")
    .refine(
      (items) => new Set(items.map((i) => i.saleItemId)).size === items.length,
      { message: "Each sale line can only appear once" },
    ),
});

export type ReturnInput = z.input<typeof returnSchema>;
export type ReturnData = z.output<typeof returnSchema>;
export type ReturnItemData = z.output<typeof returnItemSchema>;
