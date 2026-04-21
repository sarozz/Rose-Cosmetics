import { z } from "zod";

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

const purchaseItemSchema = z.object({
  productId: z.string().cuid("Select a product"),
  qty: positiveInt,
  costPrice: price,
  sellPrice: price,
});

export const purchaseSchema = z.object({
  supplierId: z.string().cuid("Select a supplier"),
  purchaseDate: z.coerce.date().optional(),
  notes: empty.pipe(z.string().max(2000).nullable()),
  items: z
    .array(purchaseItemSchema)
    .min(1, "Add at least one line")
    // Receiving the same product twice in one PO would create a confusing
    // ledger. If both lines are legitimate (e.g. different cost), the user
    // should combine them into one line with a weighted cost.
    .refine(
      (items) => new Set(items.map((i) => i.productId)).size === items.length,
      { message: "Each product can only appear once per purchase" },
    ),
});

export type PurchaseInput = z.input<typeof purchaseSchema>;
export type PurchaseData = z.output<typeof purchaseSchema>;
export type PurchaseItemData = z.output<typeof purchaseItemSchema>;
