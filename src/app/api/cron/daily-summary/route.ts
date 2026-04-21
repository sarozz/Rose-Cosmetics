import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  sendDailySummary,
  type DailySummaryStats,
} from "@/lib/services/telegram";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Daily sales summary, invoked by Vercel Cron.
 *
 * Authenticated via `CRON_SECRET`: Vercel Cron sends
 *   Authorization: Bearer $CRON_SECRET
 * on every scheduled call. We reject anything else so the endpoint isn't
 * a public trigger.
 *
 * The summary covers the UTC day that just ended (yesterday at the time
 * the cron fires). Running this cron at 02:00 UTC (~07:45 Nepal) lands
 * the message in the owner's morning.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const endExclusive = startOfUtcDay(now);
  const start = new Date(endExclusive);
  start.setUTCDate(start.getUTCDate() - 1);

  const stats = await buildStats(start, endExclusive);
  const results = await sendDailySummary(stats);

  const sent = results.filter((r) => r.ok).length;
  const failed = results.length - sent;
  return NextResponse.json({
    ok: true,
    date: stats.dateLabel,
    stats,
    sent,
    failed,
    errors: results.filter((r) => !r.ok).map((r) => r.error),
  });
}

async function buildStats(
  start: Date,
  endExclusive: Date,
): Promise<DailySummaryStats> {
  const [sales, payments, topRows, lowStockRows] = await Promise.all([
    prisma.sale.findMany({
      where: {
        status: "COMPLETED",
        soldAt: { gte: start, lt: endExclusive },
      },
      select: { total: true },
    }),
    prisma.payment.groupBy({
      by: ["method"],
      where: {
        sale: {
          status: "COMPLETED",
          soldAt: { gte: start, lt: endExclusive },
        },
      },
      _sum: { amount: true },
    }),
    prisma.saleItem.groupBy({
      by: ["productId"],
      where: {
        sale: {
          status: "COMPLETED",
          soldAt: { gte: start, lt: endExclusive },
        },
      },
      _sum: { qty: true },
      orderBy: { _sum: { qty: "desc" } },
      take: 1,
    }),
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM products
      WHERE "isActive" = true
        AND "reorderLevel" > 0
        AND "currentStock" <= "reorderLevel"
    `,
  ]);

  const total = sales.reduce(
    (sum, s) => sum.add(s.total),
    new Prisma.Decimal(0),
  );
  const byMethod = new Map<string, Prisma.Decimal>();
  for (const p of payments) {
    byMethod.set(p.method, p._sum.amount ?? new Prisma.Decimal(0));
  }

  let topProduct: { name: string; qty: number } | null = null;
  if (topRows.length > 0) {
    const product = await prisma.product.findUnique({
      where: { id: topRows[0].productId },
      select: { name: true },
    });
    if (product) {
      topProduct = { name: product.name, qty: topRows[0]._sum.qty ?? 0 };
    }
  }

  return {
    dateLabel: start.toISOString().slice(0, 10),
    salesCount: sales.length,
    salesTotal: total.toFixed(2),
    cashTotal: (byMethod.get("CASH") ?? new Prisma.Decimal(0)).toFixed(2),
    cardTotal: (byMethod.get("CARD") ?? new Prisma.Decimal(0)).toFixed(2),
    otherTotal: (byMethod.get("OTHER") ?? new Prisma.Decimal(0)).toFixed(2),
    topProduct,
    lowStockCount: Number(lowStockRows[0]?.count ?? 0n),
  };
}

function startOfUtcDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}
