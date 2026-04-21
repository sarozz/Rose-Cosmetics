import type { Prisma } from "@prisma/client";

type TxClient = Prisma.TransactionClient;

/**
 * Generate a human-readable purchase reference like `PO-20260421-0007`. The
 * per-day counter is computed inside the caller's transaction so concurrent
 * receipts don't collide. The schema still enforces uniqueness as a safety net.
 */
export async function generatePurchaseRef(tx: TxClient): Promise<string> {
  const now = new Date();
  const stamp = formatYmd(now);
  const prefix = `PO-${stamp}-`;

  const latest = await tx.purchase.findFirst({
    where: { purchaseRef: { startsWith: prefix } },
    orderBy: { purchaseRef: "desc" },
    select: { purchaseRef: true },
  });
  const next = latest ? parseCounter(latest.purchaseRef) + 1 : 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

function formatYmd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function parseCounter(ref: string): number {
  const parts = ref.split("-");
  const last = parts[parts.length - 1];
  const n = Number.parseInt(last, 10);
  return Number.isFinite(n) ? n : 0;
}
