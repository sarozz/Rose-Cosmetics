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

const integerNonNeg = z.coerce
  .number({ invalid_type_error: "Enter a number" })
  .int("Must be a whole number")
  .nonnegative("Must be zero or more");

export const productSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(200),
    brand: empty.pipe(z.string().max(120).nullable()),
    barcode: empty.pipe(
      z
        .string()
        .refine(isValidBarcodeFormat, {
          message: "Enter 8 to 14 digits (no letters or spaces)",
        })
        .nullable(),
    ),
    sku: empty.pipe(z.string().max(40).nullable()),
    categoryId: empty.pipe(z.string().cuid().nullable()),
    costPrice: price,
    sellPrice: price,
    reorderLevel: integerNonNeg.default(0),
    isActive: z.boolean().default(true),
  })
  .refine((v) => v.sellPrice >= v.costPrice, {
    path: ["sellPrice"],
    message: "Sell price cannot be below cost price",
  });

export type ProductInput = z.input<typeof productSchema>;
export type ProductData = z.output<typeof productSchema>;
