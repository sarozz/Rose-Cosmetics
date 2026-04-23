"use server";

import { revalidatePath } from "next/cache";
import { SALES_ROLES, requireRole } from "@/lib/auth";
import { closeSchema } from "@/lib/validation/close";
import { createClose } from "@/lib/services/close";
import type { CloseFormState } from "./state";

export async function createCloseAction(
  _prev: CloseFormState,
  formData: FormData,
): Promise<CloseFormState> {
  const actor = await requireRole(SALES_ROLES);

  const parsed = closeSchema.safeParse({
    openingFloat: formData.get("openingFloat") ?? "0",
    countedCash: formData.get("countedCash") ?? "",
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    return {
      fieldErrors: toFieldErrors(parsed.error.flatten().fieldErrors),
      formError: parsed.error.flatten().formErrors[0] ?? null,
    };
  }

  let result: { id: string };
  try {
    result = await createClose(actor.id, parsed.data);
  } catch (err) {
    console.error("createCloseAction failed", err);
    return {
      fieldErrors: {},
      formError: err instanceof Error ? err.message : "Could not record close",
    };
  }

  revalidatePath("/close");
  return { fieldErrors: {}, formError: null, closeId: result.id };
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
