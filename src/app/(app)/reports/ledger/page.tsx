import { requireRole, REPORT_VIEW_ROLES } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { recentMovements } from "@/lib/services/report";

export const metadata = { title: "Inventory ledger — Rose Cosmetics" };

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ productId?: string }>;
}) {
  await requireRole(REPORT_VIEW_ROLES);
  const { productId } = await searchParams;

  const [products, movements] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    recentMovements({ productId, limit: 200 }),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader
        eyebrow="Reports"
        title="Inventory ledger"
        description="Every stock change in the system. Every receipt, sale, and refund line writes exactly one row here."
      />

      <form method="get" className="flex items-center gap-2">
        <label htmlFor="productId" className="text-sm text-ink-muted">
          Filter by product
        </label>
        <select
          id="productId"
          name="productId"
          defaultValue={productId ?? ""}
          className="block w-72 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200"
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
          <a href="/reports/ledger" className="text-sm text-ink-muted hover:underline">
            Clear
          </a>
        ) : null}
      </form>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3 text-right">Qty Δ</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Recorded by</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
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
                      m.qtyDelta >= 0 ? "text-emerald-700" : "text-rose-700"
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
