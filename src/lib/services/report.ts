import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Cache tags used to invalidate report caches from mutation services.
 * Keep in sync with the `revalidateTag` calls elsewhere.
 */
export const REPORT_TAGS = {
  sales: "reports:sales",
  stock: "reports:stock",
} as const;

const AGGREGATE_TTL_SECONDS = 30;

function startOfUtcDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function formatYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Today's sales count + total (UTC day). Displayed on the dashboard.
 * Cached for 30s so rapid dashboard navigations don't re-aggregate.
 */
export const todaysSalesSummary = unstable_cache(
  async () => {
    const start = startOfUtcDay(new Date());
    const sales = await prisma.sale.findMany({
      where: { status: "COMPLETED", soldAt: { gte: start } },
      select: { total: true },
    });
    // Sum as string to keep the cache entry JSON-serialisable. The value is
    // small, so accumulating Decimal → string → Decimal on the way out is
    // cheaper than re-querying.
    const total = sales.reduce(
      (sum, s) => sum.add(s.total),
      new Prisma.Decimal(0),
    );
    return { count: sales.length, total: total.toString() };
  },
  ["reports:todaysSales"],
  { revalidate: AGGREGATE_TTL_SECONDS, tags: [REPORT_TAGS.sales] },
);

/**
 * Group COMPLETED sales by UTC day for the last `days` days. We fetch the rows
 * and aggregate in JS rather than using `$queryRaw` with `date_trunc` — the
 * volume is small and this keeps the query portable.
 */
export const salesByDay = unstable_cache(
  async (days = 30) => {
    const start = startOfUtcDay(new Date());
    start.setUTCDate(start.getUTCDate() - (days - 1));

    const sales = await prisma.sale.findMany({
      where: { status: "COMPLETED", soldAt: { gte: start } },
      select: { soldAt: true, total: true },
    });

    const buckets = new Map<string, { count: number; total: Prisma.Decimal }>();
    for (const s of sales) {
      const key = formatYmd(startOfUtcDay(s.soldAt));
      const cur = buckets.get(key) ?? { count: 0, total: new Prisma.Decimal(0) };
      cur.count += 1;
      cur.total = cur.total.add(s.total);
      buckets.set(key, cur);
    }

    const out: Array<{ date: string; count: number; total: string }> = [];
    for (let i = 0; i < days; i++) {
      const day = new Date(start);
      day.setUTCDate(day.getUTCDate() + i);
      const key = formatYmd(day);
      const bucket = buckets.get(key);
      out.push({
        date: key,
        count: bucket?.count ?? 0,
        total: (bucket?.total ?? new Prisma.Decimal(0)).toString(),
      });
    }
    return out.reverse();
  },
  ["reports:salesByDay"],
  { revalidate: AGGREGATE_TTL_SECONDS, tags: [REPORT_TAGS.sales] },
);

/**
 * Top products by units sold within the window. Ranked by total qty, then by
 * total revenue for ties.
 */
export const topProducts = unstable_cache(
  async (days = 30, limit = 10) => {
    const start = startOfUtcDay(new Date());
    start.setUTCDate(start.getUTCDate() - (days - 1));

    const grouped = await prisma.saleItem.groupBy({
      by: ["productId"],
      where: { sale: { status: "COMPLETED", soldAt: { gte: start } } },
      _sum: { qty: true, lineTotal: true },
      orderBy: { _sum: { qty: "desc" } },
      take: limit,
    });

    const productIds = grouped.map((g) => g.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, brand: true, barcode: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    return grouped.map((g) => {
      const p = byId.get(g.productId);
      return {
        productId: g.productId,
        name: p?.name ?? "(deleted)",
        brand: p?.brand ?? null,
        barcode: p?.barcode ?? null,
        qty: g._sum.qty ?? 0,
        revenue: (g._sum.lineTotal ?? new Prisma.Decimal(0)).toString(),
      };
    });
  },
  ["reports:topProducts"],
  { revalidate: AGGREGATE_TTL_SECONDS, tags: [REPORT_TAGS.sales] },
);

/**
 * Products at or below their reorder threshold. `reorderLevel = 0` is
 * treated as "not tracked" and excluded.
 */
export const lowStock = unstable_cache(
  async (limit = 50) => {
    const items = await prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        brand: string | null;
        barcode: string | null;
        currentStock: number;
        reorderLevel: number;
      }>
    >`
      SELECT id, name, brand, barcode, "currentStock", "reorderLevel"
      FROM products
      WHERE "isActive" = true
        AND "reorderLevel" > 0
        AND "currentStock" <= "reorderLevel"
      ORDER BY ("currentStock"::float / NULLIF("reorderLevel", 0)) ASC,
               name ASC
      LIMIT ${limit}
    `;
    return items;
  },
  ["reports:lowStock"],
  { revalidate: AGGREGATE_TTL_SECONDS, tags: [REPORT_TAGS.stock] },
);

export const lowStockCount = unstable_cache(
  async () => {
    const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM products
      WHERE "isActive" = true
        AND "reorderLevel" > 0
        AND "currentStock" <= "reorderLevel"
    `;
    return Number(rows[0]?.count ?? 0n);
  },
  ["reports:lowStockCount"],
  { revalidate: AGGREGATE_TTL_SECONDS, tags: [REPORT_TAGS.stock] },
);

/**
 * Recent ledger movements, optionally filtered by product. Used on the
 * ledger audit page.
 */
export async function recentMovements(params?: {
  productId?: string;
  limit?: number;
}) {
  return prisma.inventoryMovement.findMany({
    where: params?.productId ? { productId: params.productId } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      product: { select: { id: true, name: true, barcode: true } },
      createdBy: { select: { id: true, displayName: true } },
    },
    take: params?.limit ?? 100,
  });
}
