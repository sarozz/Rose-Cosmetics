import type { Prisma } from "@prisma/client";

type TxClient = Prisma.TransactionClient;

/**
 * Generate a human-readable sale reference like `SR-20260421-0007`. Counter is
 * computed inside the caller's transaction; the unique index on `saleRef` is
 * the safety net against concurrent collisions.
 */
export async function generateSaleRef(tx: TxClient): Promise<string> {
  const now = new Date();
  const stamp = formatYmd(now);
  const prefix = `SR-${stamp}-`;

  const latest = await tx.sale.findFirst({
    where: { saleRef: { startsWith: prefix } },
    orderBy: { saleRef: "desc" },
    select: { saleRef: true },
  });
  const next = latest ? parseCounter(latest.saleRef) + 1 : 1;
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
