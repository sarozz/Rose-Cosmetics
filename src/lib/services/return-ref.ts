import type { Prisma } from "@prisma/client";

type TxClient = Prisma.TransactionClient;

/**
 * Generate a human-readable return reference like `RT-20260421-0007`. Counter
 * is computed inside the caller's transaction; the unique index on `returnRef`
 * is the safety net against concurrent collisions.
 */
export async function generateReturnRef(tx: TxClient): Promise<string> {
  const now = new Date();
  const stamp = formatYmd(now);
  const prefix = `RT-${stamp}-`;

  const latest = await tx.return.findFirst({
    where: { returnRef: { startsWith: prefix } },
    orderBy: { returnRef: "desc" },
    select: { returnRef: true },
  });
  const next = latest ? parseCounter(latest.returnRef) + 1 : 1;
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
