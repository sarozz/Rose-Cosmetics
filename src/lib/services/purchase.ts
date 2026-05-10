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
  const result = await prisma.$transaction(
    async (tx) => {
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
          debited: data.debited,
          credit: data.credit,
          vat: data.vat,
          discount: data.discount,
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

      // Per-line stock + ledger writes run in parallel. Each line targets a
      // different product, so there's no within-transaction lock contention.
      // This roughly halves the wall-clock cost vs. the previous serial loop,
      // which mattered when Vercel↔Supabase RTT * 2 calls per line was
      // pushing the default 5s transaction window.
      await Promise.all(
        data.items.flatMap((item) => [
          tx.product.update({
            where: { id: item.productId },
            data: {
              currentStock: { increment: item.qty },
              costPrice: item.costPrice,
              sellPrice: item.sellPrice,
            },
          }),
          tx.inventoryMovement.create({
            data: {
              productId: item.productId,
              movementType: "PURCHASE_IN",
              qtyDelta: item.qty,
              sourceTable: "purchases",
              sourceId: purchase.id,
              createdById: actorUserId,
            },
          }),
        ]),
      );

      await writeAuditLog(tx, {
        actorUserId,
        entityType: "purchase",
        entityId: purchase.id,
        action: "CREATE",
        after: purchase,
      });

      return purchase;
    },
    {
      // Default is 5s — too tight for Vercel→Supabase round-trips when a
      // receipt has more than a couple of lines.
      timeout: 30_000,
      maxWait: 10_000,
    },
  );

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

export class PurchaseUpdateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PurchaseUpdateError";
  }
}

/**
 * Edit a previously-recorded receipt. Edits are non-trivial because every
 * line wrote stock + an inventory movement when first received. The shape
 * of an edit transaction:
 *
 *   1. Decrement product.currentStock by every old line's qty (rolling
 *      back the original receipt's effect on stock).
 *   2. Delete the inventory_movements + purchase_items the original
 *      receipt wrote.
 *   3. Insert the new line items, increment stock, write new movements,
 *      and refresh product cost/sell from the new lines (mirrors create).
 *   4. Update the purchase header (supplier, date, notes, settlement).
 *   5. Audit log with before+after.
 *
 * Negative stock is allowed (matches `deletePurchase`) — we trust the
 * operator to fix stock out-of-band if they're editing an old receipt
 * whose units have already been sold. The DB schema doesn't constrain
 * currentStock to ≥0 so the underflow is recoverable.
 */
export async function updatePurchase(
  actorUserId: string,
  id: string,
  data: PurchaseData,
) {
  const before = await prisma.purchase.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!before) throw new PurchaseUpdateError("Receipt not found");

  const totalCost = data.items.reduce(
    (sum, item) =>
      sum.add(new Prisma.Decimal(item.costPrice).mul(item.qty)),
    new Prisma.Decimal(0),
  );

  const result = await prisma.$transaction(
    async (tx) => {
      // 1. Reverse the original receipt's stock effect (parallel — different
      // products, no contention).
      await Promise.all(
        before.items.map((item) =>
          tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { decrement: item.qty } },
          }),
        ),
      );
      // 2. Drop the old movements + line items.
      await Promise.all([
        tx.inventoryMovement.deleteMany({
          where: { sourceTable: "purchases", sourceId: id },
        }),
        tx.purchaseItem.deleteMany({ where: { purchaseId: id } }),
      ]);

      // 3. Update the header.
      const purchase = await tx.purchase.update({
        where: { id },
        data: {
          supplierId: data.supplierId,
          purchaseDate: data.purchaseDate ?? before.purchaseDate,
          notes: data.notes,
          totalCost,
          debited: data.debited,
          credit: data.credit,
          vat: data.vat,
          discount: data.discount,
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

      // 4. Apply the new lines (parallel).
      await Promise.all(
        data.items.flatMap((item) => [
          tx.product.update({
            where: { id: item.productId },
            data: {
              currentStock: { increment: item.qty },
              costPrice: item.costPrice,
              sellPrice: item.sellPrice,
            },
          }),
          tx.inventoryMovement.create({
            data: {
              productId: item.productId,
              movementType: "PURCHASE_IN",
              qtyDelta: item.qty,
              sourceTable: "purchases",
              sourceId: purchase.id,
              createdById: actorUserId,
            },
          }),
        ]),
      );

      await writeAuditLog(tx, {
        actorUserId,
        entityType: "purchase",
        entityId: id,
        action: "UPDATE",
        before,
        after: purchase,
      });

      return purchase;
    },
    { timeout: 30_000, maxWait: 10_000 },
  );

  revalidateTag(REPORT_TAGS.stock);
  revalidateTag(CATALOG_TAGS.STOCK);
  return result;
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
