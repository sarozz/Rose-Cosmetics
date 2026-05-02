import { Prisma, type UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type StaffPerformanceRow = {
  cashierId: string;
  displayName: string;
  role: UserRole;
  salesCount: number;
  itemsSold: number;
  /** Sum of sale.total for the period, formatted to 2dp. */
  revenue: string;
  /** Mean of sale.total — `revenue / salesCount`, formatted to 2dp. */
  averageSale: string;
  topProductName: string | null;
  topProductQty: number;
};

/**
 * Per-cashier rollup for one calendar month (UTC). Used by the Staff
 * performance report so the owner can see who sold how much and what
 * their best mover was.
 *
 * Implementation note: SaleItem doesn't carry cashierId, so we pull the
 * raw line items with the related sale.cashierId + product.name and
 * aggregate in JS. For a single-shop POS the row count fits comfortably
 * in memory (a few thousand items per month).
 */
export async function staffPerformanceForMonth(
  year: number,
  monthIndex: number, // 0-based, matches JS Date
): Promise<StaffPerformanceRow[]> {
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1));

  const [sales, items] = await Promise.all([
    prisma.sale.findMany({
      where: {
        status: "COMPLETED",
        soldAt: { gte: start, lt: end },
      },
      select: {
        cashierId: true,
        total: true,
        cashier: { select: { displayName: true, role: true } },
      },
    }),
    prisma.saleItem.findMany({
      where: {
        sale: {
          status: "COMPLETED",
          soldAt: { gte: start, lt: end },
        },
      },
      select: {
        qty: true,
        productId: true,
        product: { select: { name: true } },
        sale: { select: { cashierId: true } },
      },
    }),
  ]);

  // Per-cashier sales aggregate.
  type SalesAgg = {
    displayName: string;
    role: UserRole;
    salesCount: number;
    revenue: Prisma.Decimal;
  };
  const salesByCashier = new Map<string, SalesAgg>();
  for (const s of sales) {
    const cur =
      salesByCashier.get(s.cashierId) ??
      ({
        displayName: s.cashier.displayName,
        role: s.cashier.role,
        salesCount: 0,
        revenue: new Prisma.Decimal(0),
      } as SalesAgg);
    cur.salesCount += 1;
    cur.revenue = cur.revenue.add(s.total);
    salesByCashier.set(s.cashierId, cur);
  }

  // Per-cashier items aggregate + per-(cashier, product) qty for top product.
  const itemsByCashier = new Map<string, number>();
  type ProductTally = { name: string; qty: number };
  const productByCashier = new Map<string, Map<string, ProductTally>>();
  for (const it of items) {
    const cid = it.sale.cashierId;
    itemsByCashier.set(cid, (itemsByCashier.get(cid) ?? 0) + it.qty);

    let bucket = productByCashier.get(cid);
    if (!bucket) {
      bucket = new Map<string, ProductTally>();
      productByCashier.set(cid, bucket);
    }
    const cur = bucket.get(it.productId) ?? {
      name: it.product?.name ?? "(deleted)",
      qty: 0,
    };
    cur.qty += it.qty;
    bucket.set(it.productId, cur);
  }

  const rows: StaffPerformanceRow[] = [];
  for (const [cashierId, agg] of salesByCashier.entries()) {
    const items = itemsByCashier.get(cashierId) ?? 0;
    let topName: string | null = null;
    let topQty = 0;
    const products = productByCashier.get(cashierId);
    if (products) {
      for (const tally of products.values()) {
        if (tally.qty > topQty) {
          topName = tally.name;
          topQty = tally.qty;
        }
      }
    }
    const avg =
      agg.salesCount > 0
        ? agg.revenue.div(agg.salesCount)
        : new Prisma.Decimal(0);
    rows.push({
      cashierId,
      displayName: agg.displayName,
      role: agg.role,
      salesCount: agg.salesCount,
      itemsSold: items,
      revenue: agg.revenue.toFixed(2),
      averageSale: avg.toFixed(2),
      topProductName: topName,
      topProductQty: topQty,
    });
  }

  return rows.sort((a, b) => Number(b.revenue) - Number(a.revenue));
}

/** Last `n` months ending with the current one, in UTC. */
export function recentMonthOptions(n = 12): Array<{
  value: string;
  label: string;
  year: number;
  monthIndex: number;
}> {
  const out: Array<{
    value: string;
    label: string;
    year: number;
    monthIndex: number;
  }> = [];
  const now = new Date();
  const baseYear = now.getUTCFullYear();
  const baseMonth = now.getUTCMonth();
  for (let i = 0; i < n; i++) {
    const m = new Date(Date.UTC(baseYear, baseMonth - i, 1));
    const y = m.getUTCFullYear();
    const mi = m.getUTCMonth();
    const value = `${y}-${String(mi + 1).padStart(2, "0")}`;
    const label = m.toLocaleString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
    out.push({ value, label, year: y, monthIndex: mi });
  }
  return out;
}

export function parseMonthValue(
  value: string | undefined,
): { year: number; monthIndex: number; value: string } {
  const now = new Date();
  const fallback = {
    year: now.getUTCFullYear(),
    monthIndex: now.getUTCMonth(),
    value: `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`,
  };
  if (!value) return fallback;
  const m = /^(\d{4})-(\d{2})$/.exec(value);
  if (!m) return fallback;
  const year = Number(m[1]);
  const monthIndex = Number(m[2]) - 1;
  if (
    !Number.isFinite(year) ||
    monthIndex < 0 ||
    monthIndex > 11
  ) {
    return fallback;
  }
  return { year, monthIndex, value };
}
