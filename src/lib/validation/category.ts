import { z } from "zod";

const empty = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v));

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  parentId: empty.pipe(z.string().cuid().nullable()),
  isActive: z.boolean().default(true),
});

export type CategoryInput = z.input<typeof categorySchema>;
export type CategoryData = z.output<typeof categorySchema>;
