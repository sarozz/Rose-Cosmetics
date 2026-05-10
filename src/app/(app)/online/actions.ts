"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { OnlineOrderStatus, OnlineSalesChannel } from "@prisma/client";
import { requireRole, SALES_ROLES, INVENTORY_WRITE_ROLES } from "@/lib/auth";
import {
  onlineOrderCreateSchema,
  onlineStatusUpdateSchema,
} from "@/lib/validation/online-order";
import {
  createOnlineOrder,
  OnlineOrderError,
  updateOnlineOrderStatus,
} from "@/lib/services/online-order";
import { lookupProductByBarcode } from "@/lib/services/sale";
import type { OnlineFormState, OnlineScanResult } from "./state";

const STATUS_UPDATE_ROLES = Array.from(
  new Set([...SALES_ROLES, ...INVENTORY_WRITE_ROLES]),
);

export async function scanOnlineBarcodeAction(
  barcode: string,
): Promise<OnlineScanResult> {
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

export async function createOnlineOrderAction(
  _prev: OnlineFormState,
  formData: FormData,
): Promise<OnlineFormState> {
  const actor = await requireRole(SALES_ROLES);

  const channelRaw = String(formData.get("channel") ?? "INSTAGRAM");
  const parsed = onlineOrderCreateSchema.safeParse({
    customerName: formData.get("customerName") ?? "",
    customerPhone: formData.get("customerPhone") ?? "",
    customerAddress: formData.get("customerAddress") ?? "",
    note: formData.get("note") ?? "",
    channel: (Object.values(OnlineSalesChannel) as string[]).includes(channelRaw)
      ? (channelRaw as OnlineSalesChannel)
      : "INSTAGRAM",
    discount: formData.get("discount") ?? "0",
    items: parseItems(formData),
  });

  if (!parsed.success) {
    return {
      fieldErrors: toFieldErrors(parsed.error.flatten().fieldErrors),
      formError: parsed.error.flatten().formErrors[0] ?? null,
    };
  }

  let order: { id: string };
  try {
    order = await createOnlineOrder(actor.id, parsed.data);
  } catch (err) {
    if (err instanceof OnlineOrderError) {
      return { fieldErrors: {}, formError: err.message };
    }
    return { fieldErrors: {}, formError: friendlyError(err) };
  }

  revalidatePath("/online");
  redirect(`/online/${order.id}` as Route);
}

export async function updateStatusAction(
  orderId: string,
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const actor = await requireRole(STATUS_UPDATE_ROLES);
  const statusRaw = String(formData.get("status") ?? "");
  if (!(Object.values(OnlineOrderStatus) as string[]).includes(statusRaw)) {
    return { ok: false, error: "Invalid status" };
  }
  const parsed = onlineStatusUpdateSchema.safeParse({
    status: statusRaw,
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.flatten().fieldErrors.note?.[0] ?? "Invalid update",
    };
  }
  try {
    await updateOnlineOrderStatus(actor.id, orderId, parsed.data);
  } catch (err) {
    if (err instanceof OnlineOrderError) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: friendlyError(err) };
  }
  revalidatePath(`/online/${orderId}` as Route);
  revalidatePath("/online");
  return { ok: true };
}

function parseItems(formData: FormData) {
  const rows = new Map<
    number,
    { productId: string; qty: string; unitPrice: string }
  >();
  for (const [key, value] of formData.entries()) {
    const match = /^items\.(\d+)\.(productId|qty|unitPrice)$/.exec(key);
    if (!match) continue;
    const idx = Number(match[1]);
    const field = match[2] as "productId" | "qty" | "unitPrice";
    const row = rows.get(idx) ?? { productId: "", qty: "", unitPrice: "" };
    row[field] = String(value);
    rows.set(idx, row);
  }
  return Array.from(rows.values()).filter(
    (r) => r.productId || r.qty || r.unitPrice,
  );
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
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("P2002")) {
    return "Duplicate order — refresh and try again.";
  }
  return "Something went wrong. Try again.";
}
