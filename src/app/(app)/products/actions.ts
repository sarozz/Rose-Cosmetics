"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CATALOG_WRITE_ROLES, requireRole } from "@/lib/auth";
import { productSchema } from "@/lib/validation/product";
import { createProduct, updateProduct } from "@/lib/services/product";
import type { ProductFormState } from "./state";

function parse(formData: FormData) {
  return productSchema.safeParse({
    name: formData.get("name") ?? "",
    brand: formData.get("brand") ?? "",
    barcode: formData.get("barcode") ?? "",
    sku: formData.get("sku") ?? "",
    categoryId: formData.get("categoryId") ?? "",
    costPrice: formData.get("costPrice") ?? "",
    sellPrice: formData.get("sellPrice") ?? "",
    reorderLevel: formData.get("reorderLevel") ?? "0",
    isActive: formData.get("isActive") === "on",
  });
}

export async function createProductAction(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const actor = await requireRole(CATALOG_WRITE_ROLES);
  const parsed = parse(formData);
  if (!parsed.success) {
    return {
      fieldErrors: toFieldErrors(parsed.error.flatten().fieldErrors),
      formError: null,
    };
  }
  try {
    await createProduct(actor.id, parsed.data);
  } catch (err) {
    return { fieldErrors: {}, formError: friendlyError(err) };
  }
  revalidatePath("/products");
  redirect("/products");
}

export async function updateProductAction(
  id: string,
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const actor = await requireRole(CATALOG_WRITE_ROLES);
  const parsed = parse(formData);
  if (!parsed.success) {
    return {
      fieldErrors: toFieldErrors(parsed.error.flatten().fieldErrors),
      formError: null,
    };
  }
  try {
    await updateProduct(actor.id, id, parsed.data);
  } catch (err) {
    return { fieldErrors: {}, formError: friendlyError(err) };
  }
  revalidatePath("/products");
  redirect("/products");
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
  // Prisma P2002 = unique constraint (barcode or sku collide).
  if (message.includes("P2002")) {
    if (message.includes("barcode")) {
      return "Another product already uses this barcode.";
    }
    if (message.includes("sku")) {
      return "Another product already uses this SKU.";
    }
    return "A product with these identifiers already exists.";
  }
  return "Something went wrong. Try again.";
}
