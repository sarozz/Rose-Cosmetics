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
 * This week (rolling 7 days incl. today) vs the previous 7 days. Used for the
 * dashboard week-over-week stat card. Returns strings to stay
 * JSON-serialisable through the unstable_cache layer.
 */
export const weekOverWeekRevenue = unstable_cache(
  async () => {
    const now = new Date();
    const today = startOfUtcDay(now);
    // include the whole "today" UTC day: end = now
    const thisStart = new Date(today);
    thisStart.setUTCDate(thisStart.getUTCDate() - 6);
    const prevEnd = thisStart; // exclusive
    const prevStart = new Date(prevEnd);
    prevStart.setUTCDate(prevStart.getUTCDate() - 7);

    const sales = await prisma.sale.findMany({
      where: {
        status: "COMPLETED",
        soldAt: { gte: prevStart },
      },
      select: { soldAt: true, total: true },
    });

    let thisTotal = new Prisma.Decimal(0);
    let prevTotal = new Prisma.Decimal(0);
    let thisCount = 0;
    let prevCount = 0;
    for (const s of sales) {
      if (s.soldAt >= thisStart) {
        thisTotal = thisTotal.add(s.total);
        thisCount += 1;
      } else if (s.soldAt >= prevStart && s.soldAt < prevEnd) {
        prevTotal = prevTotal.add(s.total);
        prevCount += 1;
      }
    }

    // Percent change is undefined when the previous window was zero; we
    // surface null so the UI can show "—" rather than a misleading ∞.
    const prevNum = Number(prevTotal.toString());
    const thisNum = Number(thisTotal.toString());
    const changePct =
      prevNum === 0 ? null : ((thisNum - prevNum) / prevNum) * 100;

    return {
      thisTotal: thisTotal.toString(),
      prevTotal: prevTotal.toString(),
      thisCount,
      prevCount,
      changePct,
    };
  },
  ["reports:weekOverWeekRevenue"],
  { revalidate: AGGREGATE_TTL_SECONDS, tags: [REPORT_TAGS.sales] },
);

/**
 * Revenue split by category for the last `days` days. Used for the dashboard
 * donut chart. Uncategorised products are bucketed as "Uncategorised". Top
 * `topN` categories are returned; the rest is folded into a single "Other"
 * slice so the donut stays readable.
 */
export const revenueByCategory = unstable_cache(
  async (days = 30, topN = 5) => {
    const start = startOfUtcDay(new Date());
    start.setUTCDate(start.getUTCDate() - (days - 1));

    const items = await prisma.saleItem.findMany({
      where: { sale: { status: "COMPLETED", soldAt: { gte: start } } },
      select: {
        lineTotal: true,
        product: {
          select: { category: { select: { id: true, name: true } } },
        },
      },
    });

    const buckets = new Map<string, { name: string; total: Prisma.Decimal }>();
    for (const it of items) {
      const cat = it.product.category;
      const key = cat?.id ?? "__uncategorised__";
      const name = cat?.name ?? "Uncategorised";
      const cur = buckets.get(key) ?? { name, total: new Prisma.Decimal(0) };
      cur.total = cur.total.add(it.lineTotal);
      buckets.set(key, cur);
    }

    const sorted = [...buckets.entries()]
      .map(([id, v]) => ({ id, name: v.name, total: v.total }))
      .sort((a, b) => (a.total.greaterThan(b.total) ? -1 : 1));

    const top = sorted.slice(0, topN);
    const rest = sorted.slice(topN);
    const restTotal = rest.reduce(
      (sum, r) => sum.add(r.total),
      new Prisma.Decimal(0),
    );

    const out = top.map((t) => ({
      id: t.id,
      name: t.name,
      total: t.total.toString(),
    }));
    if (rest.length > 0 && restTotal.greaterThan(0)) {
      out.push({ id: "__other__", name: "Other", total: restTotal.toString() });
    }
    return out;
  },
  ["reports:revenueByCategory"],
  { revalidate: AGGREGATE_TTL_SECONDS, tags: [REPORT_TAGS.sales] },
);

/**
 * Payment method revenue split for the last `days` days. Used for the
 * dashboard cash-vs-card bar.
 */
export const paymentMethodSplit = unstable_cache(
  async (days = 30) => {
    const start = startOfUtcDay(new Date());
    start.setUTCDate(start.getUTCDate() - (days - 1));

    const grouped = await prisma.payment.groupBy({
      by: ["method"],
      where: { sale: { status: "COMPLETED", soldAt: { gte: start } } },
      _sum: { amount: true },
    });

    return grouped
      .map((g) => ({
        method: g.method,
        total: (g._sum.amount ?? new Prisma.Decimal(0)).toString(),
      }))
      .sort((a, b) => Number(b.total) - Number(a.total));
  },
  ["reports:paymentMethodSplit"],
  { revalidate: AGGREGATE_TTL_SECONDS, tags: [REPORT_TAGS.sales] },
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
