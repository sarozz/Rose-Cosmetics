"use server";

import {
  CATALOG_WRITE_ROLES,
  INVENTORY_WRITE_ROLES,
  requireRole,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isValidBarcodeFormat } from "@/lib/validation/barcode";
import { productSchema } from "@/lib/validation/product";
import { createProduct } from "@/lib/services/product";
import {
  lookupBarcode,
  matchCategory,
} from "@/lib/services/product-lookup";

export type ReceivingProductOption = {
  id: string;
  name: string;
  brand: string | null;
  costPrice: string;
  sellPrice: string;
};

export type BarcodeLookupResult =
  | { kind: "invalid" }
  | { kind: "existing"; product: ReceivingProductOption }
  | {
      kind: "prefill";
      barcode: string;
      source: "open-beauty-facts" | "unknown";
      prefill: { name: string; brand: string; categoryId: string };
      categories: { id: string; name: string }[];
    };

/**
 * Called from the receiving form when the cashier scans (or types) a
 * barcode. Resolves to one of three states:
 *
 *   - `existing`: the barcode matches an active product in our catalog.
 *     The caller adds a line pre-selected on that product.
 *   - `prefill`: the barcode isn't in our catalog. If Open Beauty Facts
 *     recognises it, we return name/brand/category guesses so the quick-
 *     create dialog can pre-fill. If not, the dialog opens blank with only
 *     the barcode preserved.
 *   - `invalid`: the input isn't a usable 8–14 digit barcode.
 */
export async function lookupReceivingBarcodeAction(
  barcode: string,
): Promise<BarcodeLookupResult> {
  await requireRole(INVENTORY_WRITE_ROLES);
  const trimmed = barcode.trim();
  if (!isValidBarcodeFormat(trimmed)) return { kind: "invalid" };

  const existing = await prisma.product.findUnique({
    where: { barcode: trimmed },
    select: {
      id: true,
      name: true,
      brand: true,
      costPrice: true,
      sellPrice: true,
      isActive: true,
    },
  });
  if (existing && existing.isActive) {
    return {
      kind: "existing",
      product: {
        id: existing.id,
        name: existing.name,
        brand: existing.brand,
        costPrice: existing.costPrice.toString(),
        sellPrice: existing.sellPrice.toString(),
      },
    };
  }

  // Not in our catalog — try the free cosmetic API.
  const hit = await lookupBarcode(trimmed);
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const matchedCategory = hit
    ? matchCategory(hit.categoryHints, categories)
    : null;

  return {
    kind: "prefill",
    barcode: trimmed,
    source: hit ? "open-beauty-facts" : "unknown",
    prefill: {
      name: hit?.name ?? "",
      brand: hit?.brand ?? "",
      categoryId: matchedCategory?.id ?? "",
    },
    categories,
  };
}

export type QuickCreateResult =
  | { ok: true; product: ReceivingProductOption }
  | {
      ok: false;
      fieldErrors: Record<string, string>;
      formError: string | null;
    };

type QuickCreateInput = {
  barcode: string;
  name: string;
  brand: string;
  categoryId: string;
  costPrice: string;
  sellPrice: string;
};

/**
 * Quick-create a product straight from the receiving screen. Guarded by
 * CATALOG_WRITE_ROLES (OWNER/MANAGER) — creating brand-new SKUs is a
 * catalog action, not an inventory one, so an INVENTORY-only user hitting
 * an unknown barcode gets a clear "ask a manager" prompt instead of
 * silently inflating the catalog.
 */
export async function quickCreateProductAction(
  input: QuickCreateInput,
): Promise<QuickCreateResult> {
  const actor = await requireRole(CATALOG_WRITE_ROLES);
  const parsed = productSchema.safeParse({
    name: input.name,
    brand: input.brand,
    barcode: input.barcode,
    sku: "",
    categoryId: input.categoryId,
    costPrice: input.costPrice,
    sellPrice: input.sellPrice,
    reorderLevel: 0,
    isActive: true,
  });
  if (!parsed.success) {
    const fieldErrors = toFieldErrors(parsed.error.flatten().fieldErrors);
    return {
      ok: false,
      fieldErrors,
      formError: parsed.error.flatten().formErrors[0] ?? null,
    };
  }

  try {
    const created = await createProduct(actor.id, parsed.data);
    return {
      ok: true,
      product: {
        id: created.id,
        name: created.name,
        brand: created.brand,
        costPrice: created.costPrice.toString(),
        sellPrice: created.sellPrice.toString(),
      },
    };
  } catch (err) {
    return { ok: false, fieldErrors: {}, formError: friendlyError(err) };
  }
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
    if (message.includes("barcode")) {
      return "Another product already uses this barcode.";
    }
    return "A product with those identifiers already exists.";
  }
  return "Something went wrong. Try again.";
}
