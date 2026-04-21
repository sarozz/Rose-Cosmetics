"use server";

import { revalidatePath } from "next/cache";
import { requireRole, SALES_ROLES } from "@/lib/auth";
import { checkoutSchema } from "@/lib/validation/sale";
import {
  completeSale,
  lookupProductByBarcode,
  SaleValidationError,
} from "@/lib/services/sale";
import type { CheckoutFormState, ScanResult } from "./state";

export async function scanBarcodeAction(barcode: string): Promise<ScanResult> {
  await requireRole(SALES_ROLES);
  const trimmed = barcode.trim();
  if (!trimmed) return { ok: false, error: "Enter a barcode" };

  const product = await lookupProductByBarcode(trimmed);
  if (!product) return { ok: false, error: "No product matches that code" };

  return {
    ok: true,
    product: {
      id: product.id,
      name: product.name,
      brand: product.brand,
      barcode: product.barcode,
      sku: product.sku,
      sellPrice: product.sellPrice.toString(),
      currentStock: product.currentStock,
    },
  };
}

export async function checkoutAction(
  _prev: CheckoutFormState,
  formData: FormData,
): Promise<CheckoutFormState> {
  const actor = await requireRole(SALES_ROLES);

  const parsed = checkoutSchema.safeParse({
    items: parseItems(formData),
    saleDiscount: formData.get("saleDiscount") ?? "0",
    cashTendered: formData.get("cashTendered") ?? "0",
    notes: formData.get("notes") ?? "",
    idempotencyKey: formData.get("idempotencyKey") ?? "",
  });

  if (!parsed.success) {
    return {
      fieldErrors: toFieldErrors(parsed.error.flatten().fieldErrors),
      formError: parsed.error.flatten().formErrors[0] ?? null,
    };
  }

  let result: { saleRef: string };
  try {
    result = await completeSale(actor.id, parsed.data);
  } catch (err) {
    if (err instanceof SaleValidationError) {
      return { fieldErrors: {}, formError: err.message };
    }
    return { fieldErrors: {}, formError: friendlyError(err) };
  }

  revalidatePath("/pos");
  return { fieldErrors: {}, formError: null, saleRef: result.saleRef };
}

function parseItems(formData: FormData) {
  const rows = new Map<
    number,
    { productId: string; qty: string; unitPrice: string; discountAmount: string }
  >();
  for (const [key, value] of formData.entries()) {
    const match = /^items\.(\d+)\.(productId|qty|unitPrice|discountAmount)$/.exec(
      key,
    );
    if (!match) continue;
    const idx = Number(match[1]);
    const field = match[2] as keyof ReturnType<typeof blank>;
    const row = rows.get(idx) ?? blank();
    row[field] = String(value);
    rows.set(idx, row);
  }
  return Array.from(rows.values()).filter(
    (r) => r.productId || r.qty || r.unitPrice || r.discountAmount,
  );
}

function blank() {
  return { productId: "", qty: "", unitPrice: "", discountAmount: "0" };
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
    return "Duplicate sale — refresh and try again.";
  }
  return "Something went wrong. Try again.";
}
