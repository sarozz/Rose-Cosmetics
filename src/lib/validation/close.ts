import { z } from "zod";

const money = z.coerce
  .number({ invalid_type_error: "Enter a number" })
  .nonnegative("Must be zero or more")
  .multipleOf(0.01, "At most two decimals");

const empty = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v));

/**
 * End-of-shift cash count. The server recomputes expected cash from the
 * period's sales + refunds — the client only supplies what the cashier
 * actually has in hand (counted) and the float they started with.
 */
export const closeSchema = z.object({
  openingFloat: money.default(0),
  countedCash: money,
  notes: empty.pipe(z.string().max(500).nullable()).default(""),
});

export type CloseInput = z.input<typeof closeSchema>;
export type CloseData = z.output<typeof closeSchema>;
