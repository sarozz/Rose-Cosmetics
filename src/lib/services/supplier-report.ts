import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type SupplierRollupRow = {
  supplierId: string;
  supplierName: string;
  receipts: number;
  /** Sum of `Purchase.totalCost` (line items × qty) — pre-VAT, pre-discount. */
  totalCost: string;
  /** Sum of cash paid up-front. */
  debited: string;
  /** Sum of unpaid balance carried over each receipt. Outstanding balance owed. */
  credit: string;
  vat: string;
  discount: string;
  /** Most recent purchaseDate. */
  lastPurchaseAt: string | null;
};

/**
 * Per-supplier financial rollup over the selected window. Optional
 * `from`/`to` clip the window; default is "all time".
 *
 * Implementation: pull the raw purchases in one query and sum in JS.
 * `prisma.purchase.groupBy` would also work but we want supplier name
 * + last purchase date, both of which need a follow-up join — the
 * single findMany is simpler and the volume is fine for a single shop.
 */
export async function supplierFinancialRollup(params?: {
  from?: Date;
  to?: Date;
}): Promise<SupplierRollupRow[]> {
  const { from, to } = params ?? {};
  const purchases = await prisma.purchase.findMany({
    where: {
      status: "COMPLETED",
      purchaseDate: {
        gte: from,
        lte: to,
      },
    },
    select: {
      supplierId: true,
      totalCost: true,
      debited: true,
      credit: true,
      vat: true,
      discount: true,
      purchaseDate: true,
      supplier: { select: { name: true } },
    },
  });

  type Agg = {
    supplierName: string;
    receipts: number;
    totalCost: Prisma.Decimal;
    debited: Prisma.Decimal;
    credit: Prisma.Decimal;
    vat: Prisma.Decimal;
    discount: Prisma.Decimal;
    lastPurchaseAt: Date | null;
  };
  const map = new Map<string, Agg>();
  for (const p of purchases) {
    const cur =
      map.get(p.supplierId) ??
      ({
        supplierName: p.supplier.name,
        receipts: 0,
        totalCost: new Prisma.Decimal(0),
        debited: new Prisma.Decimal(0),
        credit: new Prisma.Decimal(0),
        vat: new Prisma.Decimal(0),
        discount: new Prisma.Decimal(0),
        lastPurchaseAt: null as Date | null,
      } as Agg);
    cur.receipts += 1;
    cur.totalCost = cur.totalCost.add(p.totalCost);
    cur.debited = cur.debited.add(p.debited);
    cur.credit = cur.credit.add(p.credit);
    cur.vat = cur.vat.add(p.vat);
    cur.discount = cur.discount.add(p.discount);
    if (!cur.lastPurchaseAt || p.purchaseDate > cur.lastPurchaseAt) {
      cur.lastPurchaseAt = p.purchaseDate;
    }
    map.set(p.supplierId, cur);
  }

  return [...map.entries()]
    .map(([supplierId, agg]) => ({
      supplierId,
      supplierName: agg.supplierName,
      receipts: agg.receipts,
      totalCost: agg.totalCost.toFixed(2),
      debited: agg.debited.toFixed(2),
      credit: agg.credit.toFixed(2),
      vat: agg.vat.toFixed(2),
      discount: agg.discount.toFixed(2),
      lastPurchaseAt: agg.lastPurchaseAt?.toISOString() ?? null,
    }))
    // Highest outstanding credit first — that's the most actionable view
    // for the owner ("who do we owe the most?").
    .sort((a, b) => Number(b.credit) - Number(a.credit) || Number(b.totalCost) - Number(a.totalCost));
}

export type SupplierHistoryEntry = {
  id: string;
  purchaseRef: string;
  purchaseDate: string;
  lines: number;
  totalCost: string;
  debited: string;
  credit: string;
  vat: string;
  discount: string;
  recordedBy: string;
};

export type SupplierHistoryResult = {
  supplier: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    defaultTerms: string | null;
  } | null;
  totals: {
    receipts: number;
    totalCost: string;
    debited: string;
    credit: string;
    vat: string;
    discount: string;
  };
  receipts: SupplierHistoryEntry[];
};

/**
 * Per-supplier full receipt history. Used by the supplier drill view
 * (/reports?section=suppliers&supplier=ID) — every Purchase that hit
 * this supplier, newest first, with its line count, totals, and the
 * full settlement breakdown.
 */
export async function supplierHistory(
  supplierId: string,
): Promise<SupplierHistoryResult> {
  const [supplier, purchases] = await Promise.all([
    prisma.supplier.findUnique({
      where: { id: supplierId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        defaultTerms: true,
      },
    }),
    prisma.purchase.findMany({
      where: { supplierId, status: "COMPLETED" },
      orderBy: { purchaseDate: "desc" },
      select: {
        id: true,
        purchaseRef: true,
        purchaseDate: true,
        totalCost: true,
        debited: true,
        credit: true,
        vat: true,
        discount: true,
        createdBy: { select: { displayName: true } },
        _count: { select: { items: true } },
      },
    }),
  ]);

  let totalCost = new Prisma.Decimal(0);
  let debited = new Prisma.Decimal(0);
  let credit = new Prisma.Decimal(0);
  let vat = new Prisma.Decimal(0);
  let discount = new Prisma.Decimal(0);
  for (const p of purchases) {
    totalCost = totalCost.add(p.totalCost);
    debited = debited.add(p.debited);
    credit = credit.add(p.credit);
    vat = vat.add(p.vat);
    discount = discount.add(p.discount);
  }

  return {
    supplier,
    totals: {
      receipts: purchases.length,
      totalCost: totalCost.toFixed(2),
      debited: debited.toFixed(2),
      credit: credit.toFixed(2),
      vat: vat.toFixed(2),
      discount: discount.toFixed(2),
    },
    receipts: purchases.map((p) => ({
      id: p.id,
      purchaseRef: p.purchaseRef,
      purchaseDate: p.purchaseDate.toISOString(),
      lines: p._count.items,
      totalCost: p.totalCost.toString(),
      debited: p.debited.toString(),
      credit: p.credit.toString(),
      vat: p.vat.toString(),
      discount: p.discount.toString(),
      recordedBy: p.createdBy.displayName,
    })),
  };
}
