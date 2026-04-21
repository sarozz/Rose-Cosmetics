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

const saleItemSchema = z.object({
  productId: z.string().cuid("Invalid product"),
  qty: positiveInt,
  unitPrice: money,
  discountAmount: money.default(0),
});

/**
 * Cash checkout payload. Discount, tax, and totals are recomputed server-side
 * from the submitted lines (blueprint §15.1) — the client values are advisory.
 * Idempotency key is client-generated (UUID) so a double submit returns the
 * same sale instead of writing twice.
 */
export const checkoutSchema = z.object({
  items: z
    .array(saleItemSchema)
    .min(1, "Add at least one item")
    .refine(
      (items) => new Set(items.map((i) => i.productId)).size === items.length,
      { message: "Each product can only appear once — combine duplicate lines" },
    ),
  saleDiscount: money.default(0),
  cashTendered: money,
  notes: empty.pipe(z.string().max(500).nullable()),
  idempotencyKey: z.string().min(8).max(64),
});

export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CheckoutData = z.output<typeof checkoutSchema>;
export type SaleItemData = z.output<typeof saleItemSchema>;
