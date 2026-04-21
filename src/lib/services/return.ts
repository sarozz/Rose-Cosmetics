import { revalidateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "./audit";
import type { ReturnData } from "@/lib/validation/return";
import { generateReturnRef } from "./return-ref";
import { REPORT_TAGS } from "./report";

export async function listReturns(params?: { limit?: number }) {
  return prisma.return.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      originalSale: { select: { id: true, saleRef: true } },
      createdBy: { select: { id: true, displayName: true } },
      _count: { select: { items: true } },
    },
    take: params?.limit ?? 50,
  });
}

export async function getReturn(returnRef: string) {
  return prisma.return.findUnique({
    where: { returnRef },
    include: {
      originalSale: { select: { id: true, saleRef: true } },
      createdBy: { select: { id: true, displayName: true } },
      items: {
        include: {
          saleItem: {
            include: {
              product: { select: { id: true, name: true, barcode: true } },
            },
          },
        },
      },
    },
  });
}

/**
 * Lookup a sale + its lines + any previously-refunded quantities. Used by the
 * "new return" page to decide what's still refundable.
 */
export async function getSaleForReturn(saleRef: string) {
  const sale = await prisma.sale.findUnique({
    where: { saleRef },
    include: {
      cashier: { select: { id: true, displayName: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, barcode: true } },
          returnItems: { select: { qty: true, refundAmount: true } },
        },
      },
    },
  });
  if (!sale) return null;

  const lines = sale.items.map((item) => {
    const refundedQty = item.returnItems.reduce((sum, r) => sum + r.qty, 0);
    const refundedAmount = item.returnItems.reduce(
      (sum, r) => sum.add(r.refundAmount),
      new Prisma.Decimal(0),
    );
    return {
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      barcode: item.product.barcode,
      qty: item.qty,
      unitPrice: item.unitPrice.toString(),
      discountAmount: item.discountAmount.toString(),
      lineTotal: item.lineTotal.toString(),
      refundedQty,
      refundableQty: item.qty - refundedQty,
      refundedAmount: refundedAmount.toString(),
      refundableAmount: item.lineTotal.sub(refundedAmount).toString(),
    };
  });

  return {
    id: sale.id,
    saleRef: sale.saleRef,
    soldAt: sale.soldAt,
    cashier: sale.cashier,
    total: sale.total.toString(),
    lines,
  };
}

export class ReturnValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReturnValidationError";
  }
}

/**
 * Record a refund against an existing sale. Blueprint §13 + §17:
 *   - Every restocked line writes a `RETURN_IN` inventory movement AND
 *     increments `product.currentStock` in the same `$transaction`.
 *   - Lines flagged non-restock (damaged) refund the money but skip the
 *     ledger / snapshot update — the original `SALE_OUT` already removed
 *     the unit, so the shelf count stays correct.
 *   - Per-line qty and refund amount are capped by what's still outstanding
 *     on the originating `SaleItem`, accounting for any earlier partial
 *     refunds. The cap is enforced inside the transaction so two concurrent
 *     returns can't both drain the same line.
 */
export async function createReturn(actorUserId: string, data: ReturnData) {
  const result = await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: { id: data.originalSaleId },
      select: { id: true, status: true, saleRef: true },
    });
    if (!sale) {
      throw new ReturnValidationError("Original sale not found");
    }
    if (sale.status !== "COMPLETED") {
      throw new ReturnValidationError(
        "Only completed sales can be refunded",
      );
    }

    const saleItemIds = data.items.map((i) => i.saleItemId);
    const saleItems = await tx.saleItem.findMany({
      where: { id: { in: saleItemIds }, saleId: sale.id },
      include: {
        product: { select: { id: true, name: true } },
        returnItems: { select: { qty: true, refundAmount: true } },
      },
    });
    const bySaleItemId = new Map(saleItems.map((s) => [s.id, s]));

    let refundTotal = new Prisma.Decimal(0);
    const preparedItems = data.items.map((item) => {
      const saleItem = bySaleItemId.get(item.saleItemId);
      if (!saleItem) {
        throw new ReturnValidationError("Sale line not found on this sale");
      }
      const alreadyQty = saleItem.returnItems.reduce((s, r) => s + r.qty, 0);
      const remainingQty = saleItem.qty - alreadyQty;
      if (item.qty > remainingQty) {
        throw new ReturnValidationError(
          `Only ${remainingQty} of ${saleItem.product.name} can still be refunded`,
        );
      }
      const alreadyAmount = saleItem.returnItems.reduce(
        (s, r) => s.add(r.refundAmount),
        new Prisma.Decimal(0),
      );
      const remainingAmount = saleItem.lineTotal.sub(alreadyAmount);
      const refund = new Prisma.Decimal(item.refundAmount);
      if (refund.gt(remainingAmount)) {
        throw new ReturnValidationError(
          `Refund for ${saleItem.product.name} exceeds ${remainingAmount.toString()} available`,
        );
      }
      refundTotal = refundTotal.add(refund);
      return {
        saleItemId: saleItem.id,
        productId: saleItem.productId,
        productName: saleItem.product.name,
        qty: item.qty,
        refundAmount: refund,
        restockFlag: item.restockFlag,
      };
    });

    const returnRef = await generateReturnRef(tx);

    const refund = await tx.return.create({
      data: {
        originalSaleId: sale.id,
        returnRef,
        refundTotal,
        status: "COMPLETED",
        reasonNote: data.reasonNote,
        createdById: actorUserId,
        items: {
          create: preparedItems.map((p) => ({
            saleItemId: p.saleItemId,
            qty: p.qty,
            refundAmount: p.refundAmount,
            restockFlag: p.restockFlag,
          })),
        },
      },
      include: { items: true },
    });

    for (const line of preparedItems) {
      if (!line.restockFlag) continue;
      await tx.product.update({
        where: { id: line.productId },
        data: { currentStock: { increment: line.qty } },
      });
      await tx.inventoryMovement.create({
        data: {
          productId: line.productId,
          movementType: "RETURN_IN",
          qtyDelta: line.qty,
          sourceTable: "returns",
          sourceId: refund.id,
          createdById: actorUserId,
        },
      });
    }

    await writeAuditLog(tx, {
      actorUserId,
      entityType: "return",
      entityId: refund.id,
      action: "CREATE",
      after: refund,
    });

    return { id: refund.id, returnRef: refund.returnRef };
  });

  // Refunds move the revenue numbers (dashboard + sales reports) and, for
  // restocked lines, the stock numbers too. Invalidate both — the small
  // amount of over-invalidation on non-restock refunds isn't worth a
  // second code path.
  revalidateTag(REPORT_TAGS.sales);
  revalidateTag(REPORT_TAGS.stock);
  return result;
}
