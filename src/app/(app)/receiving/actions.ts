"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { INVENTORY_WRITE_ROLES, requireRole } from "@/lib/auth";
import { purchaseSchema } from "@/lib/validation/purchase";
import { createPurchase } from "@/lib/services/purchase";
import type { ReceivingFormState } from "./state";

export async function createPurchaseAction(
  _prev: ReceivingFormState,
  formData: FormData,
): Promise<ReceivingFormState> {
  const actor = await requireRole(INVENTORY_WRITE_ROLES);

  const parsed = purchaseSchema.safeParse({
    supplierId: formData.get("supplierId") ?? "",
    purchaseDate: formData.get("purchaseDate") || undefined,
    notes: formData.get("notes") ?? "",
    items: parseItems(formData),
  });

  if (!parsed.success) {
    return {
      fieldErrors: toFieldErrors(parsed.error.flatten().fieldErrors),
      formError: parsed.error.flatten().formErrors[0] ?? null,
    };
  }

  try {
    await createPurchase(actor.id, parsed.data);
  } catch (err) {
    return { fieldErrors: {}, formError: friendlyError(err) };
  }

  revalidatePath("/receiving");
  redirect("/receiving");
}

function parseItems(formData: FormData) {
  // Client serializes line rows as `items.0.productId`, `items.0.qty`, etc.
  const rows = new Map<
    number,
    { productId: string; qty: string; costPrice: string; sellPrice: string }
  >();
  for (const [key, value] of formData.entries()) {
    const match = /^items\.(\d+)\.(productId|qty|costPrice|sellPrice)$/.exec(key);
    if (!match) continue;
    const idx = Number(match[1]);
    const field = match[2] as keyof ReturnType<typeof blank>;
    const row = rows.get(idx) ?? blank();
    row[field] = String(value);
    rows.set(idx, row);
  }
  return Array.from(rows.values()).filter(
    (r) => r.productId || r.qty || r.costPrice || r.sellPrice,
  );
}

function blank() {
  return { productId: "", qty: "", costPrice: "", sellPrice: "" };
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
    return "Duplicate purchase reference — retry to regenerate.";
  }
  return "Something went wrong. Try again.";
}
