import Link from "next/link";
import { PrintButton } from "@/components/print-button";
import { prisma } from "@/lib/prisma";
import { recentMovements } from "@/lib/services/report";

/**
 * Inventory ledger surface. Renders inline on /reports?section=ledger.
 * Filter state lives in `?productId=` so the same URL is bookmarkable.
 */
export async function LedgerSection({
  productId,
}: {
  productId?: string;
}) {
  const [products, movements] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    recentMovements({ productId, limit: 200 }),
  ]);

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          Every stock change in the system. Every receipt, sale, refund, or
          adjustment line writes exactly one row here.
        </p>
        <PrintButton label="Print ledger" />
      </div>

      <form method="get" className="no-print flex flex-wrap items-center gap-2">
        <input type="hidden" name="section" value="ledger" />
        <label htmlFor="productId" className="text-sm text-ink-muted">
          Filter by product
        </label>
        <select
          id="productId"
          name="productId"
          defaultValue={productId ?? ""}
          className="block w-72 rounded-md border border-white/10 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/30"
        >
          <option value="">All products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-secondary">
          Apply
        </button>
        {productId ? (
          <Link
            href="/reports?section=ledger"
            className="text-sm text-ink-muted hover:underline"
          >
            Clear
          </Link>
        ) : null}
      </form>

      <div className="overflow-x-auto rounded-lg border border-white/10 bg-card">
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3 text-right">Qty Δ</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Recorded by</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {movements.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-ink-muted">
                  No movements yet.
                </td>
              </tr>
            ) : (
              movements.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-3 font-mono text-xs text-ink-soft">
                    {m.createdAt.toISOString().replace("T", " ").slice(0, 16)}
                  </td>
                  <td className="px-4 py-3 text-ink">{m.product.name}</td>
                  <td className="px-4 py-3 text-ink-soft">{m.movementType}</td>
                  <td
                    className={`px-4 py-3 text-right tabular-nums font-medium ${
                      m.qtyDelta >= 0 ? "text-emerald-300" : "text-rose-300"
                    }`}
                  >
                    {m.qtyDelta > 0 ? `+${m.qtyDelta}` : m.qtyDelta}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                    {m.sourceTable
                      ? `${m.sourceTable}/${m.sourceId?.slice(0, 8) ?? ""}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {m.createdBy.displayName}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
