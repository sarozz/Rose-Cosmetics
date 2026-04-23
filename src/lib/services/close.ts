import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CloseData } from "@/lib/validation/close";
import { writeAuditLog } from "./audit";
import { notifyShiftClose } from "./telegram";

export type PeriodTotals = {
  periodStart: Date;
  periodEnd: Date;
  cashSalesTotal: Prisma.Decimal;
  digitalSalesTotal: Prisma.Decimal;
  cardSalesTotal: Prisma.Decimal;
  cashRefundsTotal: Prisma.Decimal;
  salesCount: number;
};

/**
 * Aggregate sales + cash refunds for a close period.
 *
 * The period runs from the previous close's `closedAt` (exclusive) up to
 * `periodEnd` (inclusive). If there's no previous close, we go back to the
 * earliest sale — the UI surfaces the window so the cashier knows what
 * they're reconciling.
 *
 * Cash refunds are *derived* from the original sale's payment method: a
 * refund against a sale that was paid in cash reduces the drawer; a
 * refund against a digital sale doesn't. Returns don't record a refund
 * method of their own, so we join back through `originalSale.payments`.
 */
export async function computePeriodTotals(
  periodStart: Date,
  periodEnd: Date,
): Promise<PeriodTotals> {
  const paymentWhere = {
    status: "COMPLETED" as const,
    sale: {
      status: "COMPLETED" as const,
      soldAt: { gt: periodStart, lte: periodEnd },
    },
  };

  const [byMethod, salesCount, cashRefunds] = await Promise.all([
    prisma.payment.groupBy({
      by: ["method"],
      where: paymentWhere,
      _sum: { amount: true },
    }),
    prisma.sale.count({
      where: {
        status: "COMPLETED",
        soldAt: { gt: periodStart, lte: periodEnd },
      },
    }),
    prisma.return.aggregate({
      where: {
        createdAt: { gt: periodStart, lte: periodEnd },
        status: { in: ["APPROVED", "COMPLETED"] },
        originalSale: {
          payments: {
            some: { method: "CASH", status: "COMPLETED" },
          },
        },
      },
      _sum: { refundTotal: true },
    }),
  ]);

  const byMethodMap = new Map<string, Prisma.Decimal>();
  for (const row of byMethod) {
    byMethodMap.set(row.method, row._sum.amount ?? new Prisma.Decimal(0));
  }

  return {
    periodStart,
    periodEnd,
    cashSalesTotal: byMethodMap.get("CASH") ?? new Prisma.Decimal(0),
    digitalSalesTotal: byMethodMap.get("OTHER") ?? new Prisma.Decimal(0),
    cardSalesTotal: byMethodMap.get("CARD") ?? new Prisma.Decimal(0),
    cashRefundsTotal: cashRefunds._sum.refundTotal ?? new Prisma.Decimal(0),
    salesCount,
  };
}

/**
 * Start-of-period reference for a new close: the previous close's `closedAt`,
 * or the earliest sale's `soldAt` if there's never been a close (so the first
 * ever close covers everything up to now).
 */
export async function previousCloseCutoff(): Promise<Date> {
  const last = await prisma.shiftClose.findFirst({
    orderBy: { closedAt: "desc" },
    select: { closedAt: true },
  });
  if (last) return last.closedAt;

  const firstSale = await prisma.sale.findFirst({
    orderBy: { soldAt: "asc" },
    select: { soldAt: true },
  });
  // One minute before the first sale, or epoch if there are no sales, so the
  // `soldAt > periodStart` window includes every past sale.
  if (firstSale) {
    return new Date(firstSale.soldAt.getTime() - 60_000);
  }
  return new Date(0);
}

/**
 * Pre-compute expected cash for the "new close" form so the cashier sees
 * the same numbers the server will use on submit. Returned totals are
 * already stringified for the RSC boundary.
 */
export async function previewClose(): Promise<{
  periodStart: string;
  periodEnd: string;
  cashSalesTotal: string;
  digitalSalesTotal: string;
  cardSalesTotal: string;
  cashRefundsTotal: string;
  salesCount: number;
  previousCloseAt: string | null;
}> {
  const periodEnd = new Date();
  const periodStart = await previousCloseCutoff();
  const totals = await computePeriodTotals(periodStart, periodEnd);
  const last = await prisma.shiftClose.findFirst({
    orderBy: { closedAt: "desc" },
    select: { closedAt: true },
  });
  return {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    cashSalesTotal: totals.cashSalesTotal.toFixed(2),
    digitalSalesTotal: totals.digitalSalesTotal.toFixed(2),
    cardSalesTotal: totals.cardSalesTotal.toFixed(2),
    cashRefundsTotal: totals.cashRefundsTotal.toFixed(2),
    salesCount: totals.salesCount,
    previousCloseAt: last?.closedAt.toISOString() ?? null,
  };
}

/**
 * Record a cash close. The aggregates ran in `previewClose` on page render
 * — we recompute them here (outside the transaction) so a sale that
 * squeaked in between preview and submit is still counted. Only the write
 * + audit go through the transaction so the default 5s interactive-tx
 * timeout covers only the write, not the scanning work.
 */
export async function createClose(
  actorUserId: string,
  data: CloseData,
): Promise<{ id: string; variance: string }> {
  const periodEnd = new Date();
  const periodStart = await previousCloseCutoff();

  // Compute totals before opening the transaction. Prisma's interactive
  // transactions hold a connection for the entire callback, and the
  // default 5s timeout is blown by three relational aggregates. Since
  // these are snapshot values (already committed sales/returns), running
  // them outside the tx is correct.
  const totals = await computePeriodTotals(periodStart, periodEnd);

  const openingFloat = new Prisma.Decimal(data.openingFloat);
  const countedCash = new Prisma.Decimal(data.countedCash);
  const expectedCash = openingFloat
    .add(totals.cashSalesTotal)
    .sub(totals.cashRefundsTotal);
  const variance = countedCash.sub(expectedCash);

  const result = await prisma.$transaction(async (tx) => {
    const close = await tx.shiftClose.create({
      data: {
        closedById: actorUserId,
        periodStart,
        periodEnd,
        openingFloat,
        expectedCash,
        countedCash,
        variance,
        cashSalesTotal: totals.cashSalesTotal,
        digitalSalesTotal: totals.digitalSalesTotal,
        cardSalesTotal: totals.cardSalesTotal,
        cashRefundsTotal: totals.cashRefundsTotal,
        salesCount: totals.salesCount,
        notes: data.notes,
      },
      include: { closedBy: { select: { displayName: true } } },
    });

    await writeAuditLog(tx, {
      actorUserId,
      entityType: "shift_close",
      entityId: close.id,
      action: "CREATE",
      after: close,
    });

    return { close };
  });

  // Fire Telegram alert after the tx commits. Errors are swallowed so a
  // Telegram outage cannot fail the close.
  try {
    await notifyShiftClose({
      closedBy: result.close.closedBy.displayName,
      closedAtLabel: formatCloseTimestamp(result.close.closedAt),
      salesCount: totals.salesCount,
      cashSalesTotal: totals.cashSalesTotal.toFixed(2),
      digitalSalesTotal: totals.digitalSalesTotal.toFixed(2),
      openingFloat: openingFloat.toFixed(2),
      expectedCash: expectedCash.toFixed(2),
      countedCash: countedCash.toFixed(2),
      variance: variance.toFixed(2),
    });
  } catch (err) {
    console.error("telegram shift-close notify failed", err);
  }

  return { id: result.close.id, variance: variance.toFixed(2) };
}

function formatCloseTimestamp(d: Date): string {
  return d.toISOString().replace("T", " ").slice(0, 16);
}

export async function listCloses(params?: { limit?: number }) {
  return prisma.shiftClose.findMany({
    orderBy: { closedAt: "desc" },
    include: { closedBy: { select: { id: true, displayName: true } } },
    take: params?.limit ?? 60,
  });
}

export async function getClose(id: string) {
  return prisma.shiftClose.findUnique({
    where: { id },
    include: { closedBy: { select: { id: true, displayName: true } } },
  });
}
