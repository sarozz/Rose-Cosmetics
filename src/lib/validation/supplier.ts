import { z } from "zod";

const empty = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v));

export const supplierSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  phone: empty.pipe(z.string().max(40).nullable()),
  email: empty.pipe(z.string().email("Enter a valid email").nullable()),
  defaultTerms: empty.pipe(z.string().max(120).nullable()),
  notes: empty.pipe(z.string().max(2000).nullable()),
  isActive: z.boolean().default(true),
});

export type SupplierInput = z.input<typeof supplierSchema>;
export type SupplierData = z.output<typeof supplierSchema>;
