import { revalidateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "./audit";
import type { PurchaseData } from "@/lib/validation/purchase";
import { generatePurchaseRef } from "./purchase-ref";
import { REPORT_TAGS } from "./report";

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
  return result;
}
