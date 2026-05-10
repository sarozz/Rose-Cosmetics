"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CATALOG_WRITE_ROLES, requireRole } from "@/lib/auth";
import { explainError } from "@/lib/errors";
import { productSchema } from "@/lib/validation/product";
import {
  createProduct,
  deleteProduct,
  ProductDeleteError,
  updateProduct,
} from "@/lib/services/product";
import type { DeleteEntityResult } from "@/components/delete-entity-button";
import {
  lookupBeautyByBarcode,
  type LookupResult,
} from "@/lib/services/external-product-lookup";
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
    const fieldErrors = toFieldErrors(parsed.error.flatten().fieldErrors);
    return {
      fieldErrors,
      formError: "Please fix the highlighted fields.",
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
    const fieldErrors = toFieldErrors(parsed.error.flatten().fieldErrors);
    return {
      fieldErrors,
      formError: "Please fix the highlighted fields.",
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

/**
 * Hit Open Beauty Facts to pre-fill the product form from a barcode.
 * Auth-gated to catalog writers — the backing API is public, but we don't
 * want random visitors firing requests through our origin.
 */
export async function lookupExternalProductAction(
  barcode: string,
): Promise<LookupResult> {
  await requireRole(CATALOG_WRITE_ROLES);
  return lookupBeautyByBarcode(barcode);
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
  return explainError(err);
}

export async function deleteProductAction(
  formData: FormData,
): Promise<DeleteEntityResult> {
  const actor = await requireRole(CATALOG_WRITE_ROLES);
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, message: "Missing product id" };
  try {
    await deleteProduct(actor.id, id);
  } catch (err) {
    if (err instanceof ProductDeleteError) {
      return { ok: false, message: err.message };
    }
    return { ok: false, message: friendlyError(err) };
  }
  revalidatePath("/products");
  return { ok: true };
}
