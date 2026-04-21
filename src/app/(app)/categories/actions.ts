"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CATALOG_WRITE_ROLES, requireRole } from "@/lib/auth";
import { categorySchema } from "@/lib/validation/category";
import { createCategory, updateCategory } from "@/lib/services/category";
import type { CategoryFormState } from "./state";

function parse(formData: FormData) {
  return categorySchema.safeParse({
    name: formData.get("name") ?? "",
    parentId: formData.get("parentId") ?? "",
    isActive: formData.get("isActive") === "on",
  });
}

export async function createCategoryAction(
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const actor = await requireRole(CATALOG_WRITE_ROLES);
  const parsed = parse(formData);
  if (!parsed.success) {
    return {
      fieldErrors: toFieldErrors(parsed.error.flatten().fieldErrors),
      formError: null,
    };
  }
  try {
    await createCategory(actor.id, parsed.data);
  } catch (err) {
    return {
      fieldErrors: {},
      formError: friendlyError(err, "category"),
    };
  }
  revalidatePath("/categories");
  redirect("/categories");
}

export async function updateCategoryAction(
  id: string,
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const actor = await requireRole(CATALOG_WRITE_ROLES);
  const parsed = parse(formData);
  if (!parsed.success) {
    return {
      fieldErrors: toFieldErrors(parsed.error.flatten().fieldErrors),
      formError: null,
    };
  }
  try {
    await updateCategory(actor.id, id, parsed.data);
  } catch (err) {
    return {
      fieldErrors: {},
      formError: friendlyError(err, "category"),
    };
  }
  revalidatePath("/categories");
  redirect("/categories");
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

function friendlyError(err: unknown, entity: string): string {
  const message = err instanceof Error ? err.message : String(err);
  // Prisma P2002 = unique constraint violation. Categories use a
  // (parentId, name) unique index.
  if (message.includes("P2002")) {
    return `A ${entity} with that name already exists under the same parent.`;
  }
  return "Something went wrong. Try again.";
}
