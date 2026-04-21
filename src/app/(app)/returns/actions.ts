"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole, RETURN_WRITE_ROLES } from "@/lib/auth";
import { returnSchema } from "@/lib/validation/return";
import { createReturn, ReturnValidationError } from "@/lib/services/return";
import type { ReturnFormState } from "./state";

export async function createReturnAction(
  _prev: ReturnFormState,
  formData: FormData,
): Promise<ReturnFormState> {
  const actor = await requireRole(RETURN_WRITE_ROLES);

  const parsed = returnSchema.safeParse({
    originalSaleId: formData.get("originalSaleId") ?? "",
    reasonNote: formData.get("reasonNote") ?? "",
    items: parseItems(formData),
  });

  if (!parsed.success) {
    return {
      fieldErrors: toFieldErrors(parsed.error.flatten().fieldErrors),
      formError: parsed.error.flatten().formErrors[0] ?? null,
    };
  }

  let result: { returnRef: string };
  try {
    result = await createReturn(actor.id, parsed.data);
  } catch (err) {
    if (err instanceof ReturnValidationError) {
      return { fieldErrors: {}, formError: err.message };
    }
    return { fieldErrors: {}, formError: friendlyError(err) };
  }

  revalidatePath("/returns");
  redirect(`/returns/thanks/${result.returnRef}`);
}

function parseItems(formData: FormData) {
  // Only rows whose `selected` checkbox is on submit — unchecked rows stay in
  // the form (so refresh doesn't lose state) but must not contribute.
  const selected = new Set<number>();
  for (const [key, value] of formData.entries()) {
    const match = /^items\.(\d+)\.selected$/.exec(key);
    if (match && value === "on") selected.add(Number(match[1]));
  }

  const rows = new Map<
    number,
    { saleItemId: string; qty: string; refundAmount: string; restockFlag: string }
  >();
  for (const [key, value] of formData.entries()) {
    const match = /^items\.(\d+)\.(saleItemId|qty|refundAmount|restockFlag)$/.exec(
      key,
    );
    if (!match) continue;
    const idx = Number(match[1]);
    if (!selected.has(idx)) continue;
    const field = match[2] as keyof ReturnType<typeof blank>;
    const row = rows.get(idx) ?? blank();
    row[field] = String(value);
    rows.set(idx, row);
  }
  return Array.from(rows.values()).filter((r) => r.saleItemId);
}

function blank() {
  return { saleItemId: "", qty: "", refundAmount: "", restockFlag: "" };
}

function toFieldErrors(
  fieldErrors: Record<string, string[] | undefined>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, msgs] of Object.entries(fieldErrors)) {
    if (msgs && msgs.length > 0) out[key] = msgs[0];
  }
  return out;
}

function friendlyError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("P2002")) {
    return "Duplicate return reference — retry to regenerate.";
  }
  return "Something went wrong. Try again.";
}
