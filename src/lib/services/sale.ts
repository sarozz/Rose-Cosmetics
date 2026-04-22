import { revalidateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "./audit";
import type { CheckoutData } from "@/lib/validation/sale";
import { generateSaleRef } from "./sale-ref";
import { REPORT_TAGS } from "./report";
import {
  notifyLowStock,
  notifySaleCompleted,
  type LowStockItem,
  type SaleCompletedItem,
} from "./telegram";

export async function listSales(params?: { limit?: number }) {
  return prisma.sale.findMany({
    orderBy: { soldAt: "desc" },
    include: {
      cashier: { select: { id: true, displayName: true } },
      _count: { select: { items: true } },
    },
    take: params?.limit ?? 50,
  });
}

export async function getSale(saleRef: string) {
  return prisma.sale.findUnique({
    where: { saleRef },
    include: {
      cashier: { select: { id: true, displayName: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, barcode: true, sku: true } },
        },
      },
      payments: true,
    },
  });
}

/**
 * Resolve a scanned barcode to a product the cashier can add to the cart.
 * Returns the fields the POS needs: price snapshot, stock, active flag.
 */
export async function lookupProductByBarcode(barcode: string) {
  const trimmed = barcode.trim();
  if (!trimmed) return null;
  return prisma.product.findFirst({
    where: {
      isActive: true,
      OR: [{ barcode: trimmed }, { sku: trimmed }],
    },
    select: {
      id: true,
      name: true,
      brand: true,
      barcode: true,
      sku: true,
      sellPrice: true,
      currentStock: true,
    },
  });
}

export class SaleValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SaleValidationError";
  }
}

/**
 * User-facing label for a `PaymentMethod` enum. `OTHER` is reserved for
 * digital wallet / QR / app payments in this codebase — surfaced as
 * "Digital" on receipts, reports, and notifications.
 */
export function paymentMethodLabel(
  method: "CASH" | "CARD" | "OTHER",
): string {
  switch (method) {
    case "CASH":
      return "Cash";
    case "CARD":
      return "Card";
    case "OTHER":
      return "Digital";
  }
}

/**
 * Complete a cash sale. Blueprint §13 + §15: every cart line writes a
 * `SaleItem`, decrements `product.currentStock`, and appends a `SALE_OUT`
 * `InventoryMovement` row inside the same `$transaction`. A `Payment` row
 * (CASH, COMPLETED) closes the sale. The idempotency key short-circuits
 * double submits (e.g. network retry) by returning the existing sale.
 */
export async function completeSale(
  actorUserId: string,
  data: CheckoutData,
) {
  const existing = await prisma.sale.findUnique({
    where: { idempotencyKey: data.idempotencyKey },
    select: { id: true, saleRef: true },
  });
  if (existing) return existing;

  const result = await prisma.$transaction(async (tx) => {
    const productIds = data.items.map((i) => i.productId);
    const products = await tx.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        sku: true,
        isActive: true,
        currentStock: true,
        reorderLevel: true,
      },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    // Compute line totals server-side so the receipt cannot be rewritten by a
    // manipulated client payload. Negative stock is rejected (blueprint §11).
    let subtotal = new Prisma.Decimal(0);
    const lines = data.items.map((item) => {
      const product = byId.get(item.productId);
      if (!product || !product.isActive) {
        throw new SaleValidationError(`Product is unavailable`);
      }
      if (product.currentStock < item.qty) {
        throw new SaleValidationError(
          `Not enough stock for ${product.name} (have ${product.currentStock})`,
        );
      }
      const unit = new Prisma.Decimal(item.unitPrice);
      const discount = new Prisma.Decimal(item.discountAmount);
      const lineTotal = unit.mul(item.qty).sub(discount);
      if (lineTotal.isNegative()) {
        throw new SaleValidationError(
          `Line discount exceeds total for ${product.name}`,
        );
      }
      subtotal = subtotal.add(lineTotal);
      return {
        productId: item.productId,
        qty: item.qty,
        unitPrice: unit,
        discountAmount: discount,
        lineTotal,
      };
    });

    const saleDiscount = new Prisma.Decimal(data.saleDiscount);
    if (saleDiscount.gt(subtotal)) {
      throw new SaleValidationError("Sale discount exceeds subtotal");
    }
    const total = subtotal.sub(saleDiscount);

    const cash = new Prisma.Decimal(data.cashTendered);
    if (cash.lt(total)) {
      throw new SaleValidationError("Cash tendered is less than total");
    }

    // DIGITAL maps onto the existing `OTHER` DB enum so we don't need a
    // schema migration. The UI surfaces it as "Digital" everywhere. The
    // payment method is record-keeping only — cash-tendered is still
    // required so totals reconcile at day close regardless of rail.
    const paymentMethod = data.paymentMethod === "DIGITAL" ? "OTHER" : "CASH";

    const saleRef = await generateSaleRef(tx);

    const sale = await tx.sale.create({
      data: {
        saleRef,
        cashierId: actorUserId,
        subtotal,
        tax: new Prisma.Decimal(0),
        discount: saleDiscount,
        total,
        status: "COMPLETED",
        idempotencyKey: data.idempotencyKey,
        items: {
          create: lines.map((l) => ({
            productId: l.productId,
            qty: l.qty,
            unitPrice: l.unitPrice,
            discountAmount: l.discountAmount,
            lineTotal: l.lineTotal,
          })),
        },
        payments: {
          create: {
            method: paymentMethod,
            amount: total,
            status: "COMPLETED",
          },
        },
      },
      include: {
        items: true,
        payments: true,
        cashier: { select: { displayName: true } },
      },
    });

    for (const line of lines) {
      await tx.product.update({
        where: { id: line.productId },
        data: { currentStock: { decrement: line.qty } },
      });
      await tx.inventoryMovement.create({
        data: {
          productId: line.productId,
          movementType: "SALE_OUT",
          qtyDelta: -line.qty,
          sourceTable: "sales",
          sourceId: sale.id,
          createdById: actorUserId,
        },
      });
    }

    await writeAuditLog(tx, {
      actorUserId,
      entityType: "sale",
      entityId: sale.id,
      action: "CREATE",
      after: sale,
    });

    // Detect products that crossed the reorder threshold as a result of
    // this sale. We alert only on the transition (before > threshold &&
    // after <= threshold) so repeat sales of an already-low item don't
    // spam Telegram. reorderLevel = 0 means "not tracked".
    const crossed: LowStockItem[] = [];
    for (const line of lines) {
      const product = byId.get(line.productId);
      if (!product || product.reorderLevel <= 0) continue;
      const before = product.currentStock;
      const after = before - line.qty;
      if (before > product.reorderLevel && after <= product.reorderLevel) {
        crossed.push({
          id: product.id,
          name: product.name,
          sku: product.sku,
          currentStock: after,
          reorderLevel: product.reorderLevel,
        });
      }
    }

    // Per-sale notification payload. Built from in-memory data so no
    // extra queries are needed after the tx. Items are capped on the
    // renderer side.
    const notificationItems: SaleCompletedItem[] = lines.map((l) => ({
      name: byId.get(l.productId)?.name ?? "(unknown)",
      qty: l.qty,
    }));
    const itemCount = lines.reduce((sum, l) => sum + l.qty, 0);

    return {
      id: sale.id,
      saleRef: sale.saleRef,
      lowStockCrossed: crossed,
      notification: {
        total: total.toFixed(2),
        itemCount,
        cashierName: sale.cashier.displayName,
        paymentLabels: sale.payments.map((p) => paymentMethodLabel(p.method)),
        items: notificationItems,
      },
    };
  });

  // Sales change today's totals, top products, and stock levels. Invalidate
  // both report caches so the dashboard/reports reflect the new sale on the
  // next request rather than waiting out the 30s TTL.
  revalidateTag(REPORT_TAGS.sales);
  revalidateTag(REPORT_TAGS.stock);

  // Fire Telegram alerts after the tx commits. Errors are swallowed so a
  // Telegram outage cannot fail the sale. We await (rather than
  // fire-and-forget) because Vercel serverless tears the function down
  // once the response ships — a detached promise might never run.
  try {
    await notifySaleCompleted({
      saleRef: result.saleRef,
      ...result.notification,
    });
  } catch (err) {
    console.error("telegram sale-completed notify failed", err);
  }
  if (result.lowStockCrossed.length > 0) {
    try {
      await notifyLowStock(result.saleRef, result.lowStockCrossed);
    } catch (err) {
      console.error("telegram low-stock notify failed", err);
    }
  }

  return { id: result.id, saleRef: result.saleRef };
}
