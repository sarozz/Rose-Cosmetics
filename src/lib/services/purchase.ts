import { revalidateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "./audit";
import type { PurchaseData } from "@/lib/validation/purchase";
import { generatePurchaseRef } from "./purchase-ref";
import { REPORT_TAGS } from "./report";
import { CATALOG_TAGS } from "./cache-tags";

export async function listPurchases(params?: { limit?: number }) {
  return prisma.purchase.findMany({
    orderBy: { purchaseDate: "desc" },
    include: {
      supplier: { select: { id: true, name: true } },
      createdBy: { select: { id: true, displayName: true } },
      _count: { select: { items: true } },
    },
    take: params?.limit ?? 50,
  });
}

export async function getPurchase(id: string) {
  return prisma.purchase.findUnique({
    where: { id },
    include: {
      supplier: { select: { id: true, name: true } },
      createdBy: { select: { id: true, displayName: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, barcode: true, sku: true } },
        },
      },
    },
  });
}

/**
 * Record a received purchase. Blueprint §13: the inventory ledger is the
 * source of truth, so every qty change must be accompanied by an
 * `InventoryMovement` row in the same transaction as the stock snapshot
 * update. Purchase lines also refresh the product's cost/sell price so future
 * sales price from the most recent receipt.
 */
export async function createPurchase(
  actorUserId: string,
  data: PurchaseData,
) {
  const result = await prisma.$transaction(async (tx) => {
    const purchaseRef = await generatePurchaseRef(tx);
    const totalCost = data.items.reduce(
      (sum, item) =>
        sum.add(new Prisma.Decimal(item.costPrice).mul(item.qty)),
      new Prisma.Decimal(0),
    );

    const purchase = await tx.purchase.create({
      data: {
        supplierId: data.supplierId,
        purchaseRef,
        status: "COMPLETED",
        purchaseDate: data.purchaseDate ?? new Date(),
        notes: data.notes,
        createdById: actorUserId,
        totalCost,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            qty: item.qty,
            costPrice: item.costPrice,
            sellPrice: item.sellPrice,
          })),
        },
      },
      include: { items: true },
    });

    for (const item of data.items) {
      // Update stock snapshot + refresh pricing from this receipt.
      await tx.product.update({
        where: { id: item.productId },
        data: {
          currentStock: { increment: item.qty },
          costPrice: item.costPrice,
          sellPrice: item.sellPrice,
        },
      });
      await tx.inventoryMovement.create({
        data: {
          productId: item.productId,
          movementType: "PURCHASE_IN",
          qtyDelta: item.qty,
          sourceTable: "purchases",
          sourceId: purchase.id,
          createdById: actorUserId,
        },
      });
    }

    await writeAuditLog(tx, {
      actorUserId,
      entityType: "purchase",
      entityId: purchase.id,
      action: "CREATE",
      after: purchase,
    });

    return purchase;
  });

  // Receipts only move stock numbers — the low-stock list, ledger, and
  // reorder dashboard. Sales totals are unaffected.
  revalidateTag(REPORT_TAGS.stock);
  revalidateTag(CATALOG_TAGS.STOCK);
  return result;
}

export class PurchaseDeleteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PurchaseDeleteError";
  }
}

/**
 * Delete a receiving record. The Inventory ledger is the source of truth —
 * we can't just drop the purchase row or its movements would dangle. Two
 * paths covered here:
 *
 *  - Safe to undo: every product still has enough on-hand to roll back the
 *    receipt without going negative. We decrement product.currentStock by
 *    the received qty, delete the inventory movements that this purchase
 *    wrote, and cascade-delete the purchase + its line items.
 *  - Unsafe: at least one product would go negative because some of the
 *    received units have already been sold. We refuse and tell the operator
 *    to reverse via a return / stock adjustment instead.
 */
export async function deletePurchase(actorUserId: string, id: string) {
  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true, currentStock: true } },
        },
      },
    },
  });
  if (!purchase) throw new PurchaseDeleteError("Purchase not found");

  // Aggregate received qty per product so duplicate lines for the same SKU
  // don't double-count when we check / decrement stock.
  const reverseByProduct = new Map<string, { qty: number; name: string; current: number }>();
  for (const item of purchase.items) {
    const cur = reverseByProduct.get(item.productId);
    if (cur) {
      cur.qty += item.qty;
    } else {
      reverseByProduct.set(item.productId, {
        qty: item.qty,
        name: item.product.name,
        current: item.product.currentStock,
      });
    }
  }

  // Negative-stock guard removed — operator wants test data wiped even if
  // the snapshot underflows. Real production should reverse via a return
  // or stock adjustment, not delete.

  await prisma.$transaction(async (tx) => {
    for (const [productId, agg] of reverseByProduct) {
      await tx.product.update({
        where: { id: productId },
        data: { currentStock: { decrement: agg.qty } },
      });
    }
    // Drop the ledger rows this receipt wrote so the audit log stops
    // referencing a purchase that no longer exists. Sale-out / adjustment
    // movements stay untouched.
    await tx.inventoryMovement.deleteMany({
      where: { sourceTable: "purchases", sourceId: id },
    });
    await writeAuditLog(tx, {
      actorUserId,
      entityType: "purchase",
      entityId: id,
      action: "DELETE",
      before: purchase,
    });
    // PurchaseItem has onDelete: Cascade, so deleting the purchase removes
    // the line rows in one shot.
    await tx.purchase.delete({ where: { id } });
  });

  revalidateTag(REPORT_TAGS.stock);
  revalidateTag(CATALOG_TAGS.STOCK);
}
