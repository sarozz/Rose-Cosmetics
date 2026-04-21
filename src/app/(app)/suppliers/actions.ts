"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CATALOG_WRITE_ROLES, requireRole } from "@/lib/auth";
import { supplierSchema } from "@/lib/validation/supplier";
import { createSupplier, updateSupplier } from "@/lib/services/supplier";
import type { SupplierFormState } from "./state";

function parse(formData: FormData) {
  return supplierSchema.safeParse({
    name: formData.get("name") ?? "",
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    defaultTerms: formData.get("defaultTerms") ?? "",
    notes: formData.get("notes") ?? "",
    isActive: formData.get("isActive") === "on",
  });
}

export async function createSupplierAction(
  _prev: SupplierFormState,
  formData: FormData,
): Promise<SupplierFormState> {
  const actor = await requireRole(CATALOG_WRITE_ROLES);
  const parsed = parse(formData);
  if (!parsed.success) {
    return {
      fieldErrors: toFieldErrors(parsed.error.flatten().fieldErrors),
      formError: null,
    };
  }
  await createSupplier(actor.id, parsed.data);
  revalidatePath("/suppliers");
  redirect("/suppliers");
}

export async function updateSupplierAction(
  id: string,
  _prev: SupplierFormState,
  formData: FormData,
): Promise<SupplierFormState> {
  const actor = await requireRole(CATALOG_WRITE_ROLES);
  const parsed = parse(formData);
  if (!parsed.success) {
    return {
      fieldErrors: toFieldErrors(parsed.error.flatten().fieldErrors),
      formError: null,
    };
  }
  await updateSupplier(actor.id, id, parsed.data);
  revalidatePath("/suppliers");
  redirect("/suppliers");
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
