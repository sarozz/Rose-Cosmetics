import { requireRole, REPORT_VIEW_ROLES } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { lowStock, salesByDay, topProducts } from "@/lib/services/report";

export const metadata = { title: "Reports — Rose Cosmetics" };

export default async function ReportsPage() {
  await requireRole(REPORT_VIEW_ROLES);

  const [byDay, top, low] = await Promise.all([
    salesByDay(30),
    topProducts(30, 10),
    lowStock(50),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        eyebrow="Reports"
        title="Daily overview"
        description="Sales in the last 30 days, your best-sellers, and anything running low. Drill into the ledger to audit every stock change."
        actions={
          <div className="flex gap-2">
            <a href="/reports/profit" className="btn-secondary">
              Profit & inventory
            </a>
            <a href="/reports/ledger" className="btn-secondary">
              Inventory ledger
            </a>
          </div>
        }
      />

      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-sm font-semibold text-ink">
            Sales · last 30 days
          </h2>
        </div>
        <div className="overflow-hidden rounded-lg border border-white/10 bg-card">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Transactions</th>
                <th className="px-4 py-3 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {byDay.map((row) => (
                <tr
                  key={row.date}
                  className={row.count === 0 ? "text-ink-muted" : "text-ink"}
                >
                  <td className="px-4 py-2 font-mono text-xs">{row.date}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {row.count}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums font-medium">
                    {row.total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink">
          Top products · last 30 days
        </h2>
        <div className="overflow-hidden rounded-lg border border-white/10 bg-card">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3 text-right">Units sold</th>
                <th className="px-4 py-3 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {top.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-ink-muted">
                    No sales recorded yet.
                  </td>
                </tr>
              ) : (
                top.map((p) => (
                  <tr key={p.productId}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink">{p.name}</div>
                      <div className="text-xs text-ink-muted">
                        {p.brand ? `${p.brand} · ` : ""}
                        {p.barcode ? (
                          <span className="font-mono">{p.barcode}</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink">
                      {p.qty}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-ink">
                      {p.revenue}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink">Low stock</h2>
        <div className="overflow-hidden rounded-lg border border-white/10 bg-card">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3 text-right">On hand</th>
                <th className="px-4 py-3 text-right">Reorder at</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {low.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-ink-muted">
                    Nothing at or below its reorder level — good to go.
                  </td>
                </tr>
              ) : (
                low.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink">{p.name}</div>
                      <div className="text-xs text-ink-muted">
                        {p.brand ? `${p.brand} · ` : ""}
                        {p.barcode ? (
                          <span className="font-mono">{p.barcode}</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-rose-300">
                      {p.currentStock}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                      {p.reorderLevel}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
