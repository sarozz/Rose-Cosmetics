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

function startOfUtcWeek(d: Date): Date {
  // Monday as start-of-week (ISO). JS Sunday = 0 → shift to Monday.
  const x = startOfUtcDay(d);
  const dow = x.getUTCDay();
  const delta = (dow + 6) % 7; // Mon=0, Sun=6
  x.setUTCDate(x.getUTCDate() - delta);
  return x;
}

function startOfUtcMonth(d: Date): Date {
  const x = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0),
  );
  return x;
}

function addDaysUtc(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

function addMonthsUtc(d: Date, n: number): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1, 0, 0, 0, 0),
  );
}

function isoWeekKey(d: Date): string {
  // ISO week key in "YYYY-W##" form. We aggregate by the Monday anchor so
  // the label matches the start of the week cashiers think in.
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
 * Group COMPLETED sales by ISO week (Monday-anchored, UTC) for the last
 * `weeks` weeks. Returns newest-first so tables and charts show the
 * most-recent period at the top.
 */
export const salesByWeek = unstable_cache(
  async (weeks = 12) => {
    const thisWeekStart = startOfUtcWeek(new Date());
    const windowStart = addDaysUtc(thisWeekStart, -7 * (weeks - 1));

    const sales = await prisma.sale.findMany({
      where: { status: "COMPLETED", soldAt: { gte: windowStart } },
      select: { soldAt: true, total: true },
    });

    const buckets = new Map<string, { count: number; total: Prisma.Decimal }>();
    for (const s of sales) {
      const key = isoWeekKey(startOfUtcWeek(s.soldAt));
      const cur = buckets.get(key) ?? { count: 0, total: new Prisma.Decimal(0) };
      cur.count += 1;
      cur.total = cur.total.add(s.total);
      buckets.set(key, cur);
    }

    const out: Array<{ date: string; count: number; total: string }> = [];
    for (let i = 0; i < weeks; i++) {
      const weekStart = addDaysUtc(windowStart, 7 * i);
      const key = isoWeekKey(weekStart);
      const bucket = buckets.get(key);
      out.push({
        date: key,
        count: bucket?.count ?? 0,
        total: (bucket?.total ?? new Prisma.Decimal(0)).toString(),
      });
    }
    return out.reverse();
  },
  ["reports:salesByWeek"],
  { revalidate: AGGREGATE_TTL_SECONDS, tags: [REPORT_TAGS.sales] },
);

/**
 * Group COMPLETED sales by calendar month (UTC) for the last `months`
 * months. The label is the first day of the month in `YYYY-MM-01` form
 * so it sorts lexicographically.
 */
export const salesByMonth = unstable_cache(
  async (months = 12) => {
    const thisMonthStart = startOfUtcMonth(new Date());
    const windowStart = addMonthsUtc(thisMonthStart, -(months - 1));

    const sales = await prisma.sale.findMany({
      where: { status: "COMPLETED", soldAt: { gte: windowStart } },
      select: { soldAt: true, total: true },
    });

    const buckets = new Map<string, { count: number; total: Prisma.Decimal }>();
    for (const s of sales) {
      const key = formatYmd(startOfUtcMonth(s.soldAt));
      const cur = buckets.get(key) ?? { count: 0, total: new Prisma.Decimal(0) };
      cur.count += 1;
      cur.total = cur.total.add(s.total);
      buckets.set(key, cur);
    }

    const out: Array<{ date: string; count: number; total: string }> = [];
    for (let i = 0; i < months; i++) {
      const monthStart = addMonthsUtc(windowStart, i);
      const key = formatYmd(monthStart);
      const bucket = buckets.get(key);
      out.push({
        date: key,
        count: bucket?.count ?? 0,
        total: (bucket?.total ?? new Prisma.Decimal(0)).toString(),
      });
    }
    return out.reverse();
  },
  ["reports:salesByMonth"],
  { revalidate: AGGREGATE_TTL_SECONDS, tags: [REPORT_TAGS.sales] },
);

export type ReportRange = "daily" | "weekly" | "monthly";

/**
 * Revenue + transaction count for the "current" window implied by `range`
 * (today / this week / this month) plus the previous equivalent window so
 * the UI can show a delta. Returns strings for JSON-serialisability.
 *
 * Used by the top-of-page KPI cards on /reports — the aim is one cached
 * read instead of four ad-hoc aggregates.
 */
export const periodSummary = unstable_cache(
  async (range: ReportRange) => {
    const now = new Date();
    let currentStart: Date;
    let previousStart: Date;
    let previousEnd: Date; // exclusive

    if (range === "daily") {
      currentStart = startOfUtcDay(now);
      previousStart = addDaysUtc(currentStart, -1);
      previousEnd = currentStart;
    } else if (range === "weekly") {
      currentStart = startOfUtcWeek(now);
      previousStart = addDaysUtc(currentStart, -7);
      previousEnd = currentStart;
    } else {
      currentStart = startOfUtcMonth(now);
      previousStart = addMonthsUtc(currentStart, -1);
      previousEnd = currentStart;
    }

    const sales = await prisma.sale.findMany({
      where: {
        status: "COMPLETED",
        soldAt: { gte: previousStart },
      },
      select: { soldAt: true, total: true },
    });

    let currTotal = new Prisma.Decimal(0);
    let prevTotal = new Prisma.Decimal(0);
    let currCount = 0;
    let prevCount = 0;
    for (const s of sales) {
      if (s.soldAt >= currentStart) {
        currTotal = currTotal.add(s.total);
        currCount += 1;
      } else if (s.soldAt >= previousStart && s.soldAt < previousEnd) {
        prevTotal = prevTotal.add(s.total);
        prevCount += 1;
      }
    }

    const avg =
      currCount > 0
        ? currTotal.div(currCount)
        : new Prisma.Decimal(0);
    const prevNumber = Number(prevTotal);
    const deltaPct =
      prevNumber > 0
        ? ((Number(currTotal) - prevNumber) / prevNumber) * 100
        : null;

    return {
      range,
      currentStart: currentStart.toISOString(),
      previousStart: previousStart.toISOString(),
      previousEnd: previousEnd.toISOString(),
      currentTotal: currTotal.toFixed(2),
      currentCount: currCount,
      averageSale: avg.toFixed(2),
      previousTotal: prevTotal.toFixed(2),
      previousCount: prevCount,
      deltaPct: deltaPct === null ? null : deltaPct.toFixed(1),
    };
  },
  ["reports:periodSummary"],
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
 * Gross profit per UTC day for the last `days` days.
 *
 * COGS is computed against the current `product.costPrice` rather than a
 * per-sale cost snapshot — we don't store a cost on `SaleItem`, and for a
 * single-location shop the drift between receipt and sale is small. If
 * this starts mattering, snapshot `costPrice` onto `SaleItem` at sale
 * time and switch this aggregate to read it.
 */
export const profitByDay = unstable_cache(
  async (days = 30) => {
    const start = startOfUtcDay(new Date());
    start.setUTCDate(start.getUTCDate() - (days - 1));

    const items = await prisma.saleItem.findMany({
      where: { sale: { status: "COMPLETED", soldAt: { gte: start } } },
      select: {
        qty: true,
        lineTotal: true,
        sale: { select: { soldAt: true } },
        product: { select: { costPrice: true } },
      },
    });

    const buckets = new Map<
      string,
      { revenue: Prisma.Decimal; cost: Prisma.Decimal }
    >();
    for (const it of items) {
      const key = formatYmd(startOfUtcDay(it.sale.soldAt));
      const cur =
        buckets.get(key) ?? {
          revenue: new Prisma.Decimal(0),
          cost: new Prisma.Decimal(0),
        };
      cur.revenue = cur.revenue.add(it.lineTotal);
      cur.cost = cur.cost.add(it.product.costPrice.mul(it.qty));
      buckets.set(key, cur);
    }

    const out: Array<{
      date: string;
      revenue: string;
      cost: string;
      profit: string;
    }> = [];
    for (let i = 0; i < days; i++) {
      const day = new Date(start);
      day.setUTCDate(day.getUTCDate() + i);
      const key = formatYmd(day);
      const b = buckets.get(key) ?? {
        revenue: new Prisma.Decimal(0),
        cost: new Prisma.Decimal(0),
      };
      out.push({
        date: key,
        revenue: b.revenue.toString(),
        cost: b.cost.toString(),
        profit: b.revenue.sub(b.cost).toString(),
      });
    }
    return out.reverse();
  },
  ["reports:profitByDay"],
  {
    revalidate: AGGREGATE_TTL_SECONDS,
    tags: [REPORT_TAGS.sales, REPORT_TAGS.stock],
  },
);

/**
 * Top products by gross profit within the window. COGS uses the product's
 * current `costPrice` — see the caveat on `profitByDay`.
 */
export const topProfitProducts = unstable_cache(
  async (days = 30, limit = 10) => {
    const start = startOfUtcDay(new Date());
    start.setUTCDate(start.getUTCDate() - (days - 1));

    const items = await prisma.saleItem.findMany({
      where: { sale: { status: "COMPLETED", soldAt: { gte: start } } },
      select: {
        productId: true,
        qty: true,
        lineTotal: true,
        product: {
          select: {
            name: true,
            brand: true,
            barcode: true,
            costPrice: true,
          },
        },
      },
    });

    type Agg = {
      name: string;
      brand: string | null;
      barcode: string | null;
      qty: number;
      revenue: Prisma.Decimal;
      cost: Prisma.Decimal;
    };
    const byProduct = new Map<string, Agg>();
    for (const it of items) {
      const cur =
        byProduct.get(it.productId) ??
        ({
          name: it.product.name,
          brand: it.product.brand,
          barcode: it.product.barcode,
          qty: 0,
          revenue: new Prisma.Decimal(0),
          cost: new Prisma.Decimal(0),
        } as Agg);
      cur.qty += it.qty;
      cur.revenue = cur.revenue.add(it.lineTotal);
      cur.cost = cur.cost.add(it.product.costPrice.mul(it.qty));
      byProduct.set(it.productId, cur);
    }

    return [...byProduct.entries()]
      .map(([productId, v]) => {
        const profit = v.revenue.sub(v.cost);
        const marginPct = v.revenue.isZero()
          ? null
          : Number(profit.div(v.revenue).mul(100).toFixed(1));
        return {
          productId,
          name: v.name,
          brand: v.brand,
          barcode: v.barcode,
          qty: v.qty,
          revenue: v.revenue.toString(),
          cost: v.cost.toString(),
          profit: profit.toString(),
          marginPct,
        };
      })
      .sort((a, b) => Number(b.profit) - Number(a.profit))
      .slice(0, limit);
  },
  ["reports:topProfitProducts"],
  {
    revalidate: AGGREGATE_TTL_SECONDS,
    tags: [REPORT_TAGS.sales, REPORT_TAGS.stock],
  },
);

/**
 * On-hand inventory value at cost and at retail, with a per-category
 * breakdown. `potentialProfit` is the margin the shop would realise if
 * every unit on hand sold at the current `sellPrice` — useful for
 * comparing stock tied up against expected return.
 */
export const inventoryValue = unstable_cache(
  async () => {
    const products = await prisma.product.findMany({
      where: { isActive: true, currentStock: { gt: 0 } },
      select: {
        id: true,
        currentStock: true,
        costPrice: true,
        sellPrice: true,
        category: { select: { id: true, name: true } },
      },
    });

    let totalCost = new Prisma.Decimal(0);
    let totalRetail = new Prisma.Decimal(0);
    let totalUnits = 0;
    type CatAgg = {
      id: string;
      name: string;
      cost: Prisma.Decimal;
      retail: Prisma.Decimal;
      units: number;
      skuCount: number;
    };
    const byCategory = new Map<string, CatAgg>();

    for (const p of products) {
      const costValue = p.costPrice.mul(p.currentStock);
      const retailValue = p.sellPrice.mul(p.currentStock);
      totalCost = totalCost.add(costValue);
      totalRetail = totalRetail.add(retailValue);
      totalUnits += p.currentStock;

      const key = p.category?.id ?? "__uncategorised__";
      const name = p.category?.name ?? "Uncategorised";
      const cur =
        byCategory.get(key) ??
        ({
          id: key,
          name,
          cost: new Prisma.Decimal(0),
          retail: new Prisma.Decimal(0),
          units: 0,
          skuCount: 0,
        } as CatAgg);
      cur.cost = cur.cost.add(costValue);
      cur.retail = cur.retail.add(retailValue);
      cur.units += p.currentStock;
      cur.skuCount += 1;
      byCategory.set(key, cur);
    }

    return {
      totalCost: totalCost.toString(),
      totalRetail: totalRetail.toString(),
      potentialProfit: totalRetail.sub(totalCost).toString(),
      totalUnits,
      totalSkus: products.length,
      byCategory: [...byCategory.values()]
        .map((c) => ({
          id: c.id,
          name: c.name,
          cost: c.cost.toString(),
          retail: c.retail.toString(),
          units: c.units,
          skuCount: c.skuCount,
        }))
        .sort((a, b) => Number(b.cost) - Number(a.cost)),
    };
  },
  ["reports:inventoryValue"],
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
