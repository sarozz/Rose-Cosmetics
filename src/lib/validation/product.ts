import { z } from "zod";
import { isValidBarcodeFormat } from "./barcode";

const empty = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v));

const price = z.coerce
  .number({ invalid_type_error: "Enter a number" })
  .nonnegative("Must be zero or more")
  .multipleOf(0.01, "At most two decimals");

// Cost price can be left blank — it fills in on first receipt. Empty input
// (or undefined) coerces to 0, treated as "unknown" downstream.
const optionalPrice = z.preprocess(
  (v) => (v === "" || v == null ? 0 : v),
  price,
);

const integerNonNeg = z.coerce
  .number({ invalid_type_error: "Enter a number" })
  .int("Must be a whole number")
  .nonnegative("Must be zero or more");

const barcode = z
  .string()
  .trim()
  .refine(isValidBarcodeFormat, {
    message: "Enter 8 to 14 digits (no letters or spaces)",
  });

const extraBarcodeSchema = z.object({
  code: barcode,
  label: empty.pipe(z.string().max(60).nullable()),
});

export const productSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(200),
    brand: empty.pipe(z.string().max(120).nullable()),
    barcode: empty.pipe(barcode.nullable()),
    sku: empty.pipe(z.string().max(40).nullable()),
    categoryId: empty.pipe(z.string().cuid().nullable()),
    costPrice: optionalPrice,
    sellPrice: price,
    reorderLevel: integerNonNeg.default(0),
    isActive: z.boolean().default(true),
    // Alternate barcodes: same product, same price, same stock — different
    // flavour or scent variant. Each scan resolves to the parent product.
    extraBarcodes: z
      .array(extraBarcodeSchema)
      .default([])
      .refine(
        (rows) =>
          new Set(rows.map((r) => r.code)).size === rows.length,
        { message: "Each barcode can only appear once" },
      ),
  })
  .refine((v) => v.costPrice === 0 || v.sellPrice >= v.costPrice, {
    path: ["sellPrice"],
    message: "Sell price cannot be below cost price",
  })
  .refine(
    (v) =>
      !v.barcode || !v.extraBarcodes.some((b) => b.code === v.barcode),
    {
      path: ["extraBarcodes"],
      message: "Additional barcodes cannot repeat the primary barcode",
    },
  );

export type ProductInput = z.input<typeof productSchema>;
export type ProductData = z.output<typeof productSchema>;
