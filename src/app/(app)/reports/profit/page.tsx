import { requireRole, REPORT_VIEW_ROLES } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import {
  inventoryValue,
  profitByDay,
  topProfitProducts,
} from "@/lib/services/report";

export const metadata = { title: "Profit & inventory — Rose Cosmetics" };

function formatAmount(n: string): string {
  const num = Number(n);
  if (!Number.isFinite(num)) return n;
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default async function ProfitReportPage() {
  await requireRole(REPORT_VIEW_ROLES);

  const [byDay, topProfit, stockValue] = await Promise.all([
    profitByDay(30),
    topProfitProducts(30, 10),
    inventoryValue(),
  ]);

  const windowTotals = byDay.reduce(
    (acc, row) => ({
      revenue: acc.revenue + Number(row.revenue),
      cost: acc.cost + Number(row.cost),
      profit: acc.profit + Number(row.profit),
    }),
    { revenue: 0, cost: 0, profit: 0 },
  );
  const windowMargin =
    windowTotals.revenue === 0
      ? null
      : (windowTotals.profit / windowTotals.revenue) * 100;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        eyebrow="Reports"
        title="Profit & inventory"
        description="Gross profit over the last 30 days and the value tied up in on-hand stock. Cost of goods uses the current product cost — drift is usually small for a single-shop catalog."
        actions={
          <a href="/reports" className="btn-secondary">
            Daily overview
          </a>
        }
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Revenue · 30d" value={formatAmount(windowTotals.revenue.toFixed(2))} />
        <StatCard label="Cost of goods · 30d" value={formatAmount(windowTotals.cost.toFixed(2))} />
        <StatCard
          label="Gross profit · 30d"
          value={formatAmount(windowTotals.profit.toFixed(2))}
          accent
        />
        <StatCard
          label="Margin · 30d"
          value={windowMargin === null ? "—" : `${windowMargin.toFixed(1)}%`}
        />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink">
          Profit · last 30 days
        </h2>
        <div className="overflow-hidden rounded-lg border border-white/10 bg-card">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Revenue</th>
                <th className="px-4 py-3 text-right">COGS</th>
                <th className="px-4 py-3 text-right">Gross profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {byDay.map((row) => {
                const blank = Number(row.revenue) === 0;
                return (
                  <tr
                    key={row.date}
                    className={blank ? "text-ink-muted" : "text-ink"}
                  >
                    <td className="px-4 py-2 font-mono text-xs">{row.date}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {formatAmount(row.revenue)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {formatAmount(row.cost)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-medium">
                      {formatAmount(row.profit)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink">
          Top products by profit · last 30 days
        </h2>
        <div className="overflow-hidden rounded-lg border border-white/10 bg-card">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3 text-right">Units</th>
                <th className="px-4 py-3 text-right">Revenue</th>
                <th className="px-4 py-3 text-right">Profit</th>
                <th className="px-4 py-3 text-right">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {topProfit.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-ink-muted">
                    No sales in the window.
                  </td>
                </tr>
              ) : (
                topProfit.map((p) => (
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
                    <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                      {formatAmount(p.revenue)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-ink">
                      {formatAmount(p.profit)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                      {p.marginPct === null ? "—" : `${p.marginPct}%`}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-sm font-semibold text-ink">On-hand inventory value</h2>
          <p className="text-xs text-ink-muted">
            {stockValue.totalSkus} active SKU{stockValue.totalSkus === 1 ? "" : "s"} · {stockValue.totalUnits} units
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard label="At cost" value={formatAmount(stockValue.totalCost)} />
          <StatCard label="At retail" value={formatAmount(stockValue.totalRetail)} />
          <StatCard
            label="Potential profit"
            value={formatAmount(stockValue.potentialProfit)}
            accent
          />
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-white/10 bg-card">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">SKUs</th>
                <th className="px-4 py-3 text-right">Units</th>
                <th className="px-4 py-3 text-right">At cost</th>
                <th className="px-4 py-3 text-right">At retail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {stockValue.byCategory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-ink-muted">
                    No stock on hand.
                  </td>
                </tr>
              ) : (
                stockValue.byCategory.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 text-ink">{c.name}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                      {c.skuCount}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                      {c.units}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-ink">
                      {formatAmount(c.cost)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                      {formatAmount(c.retail)}
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

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-ink-muted">
        {label}
      </div>
      <div
        className={`mt-1 text-xl font-semibold tabular-nums ${
          accent ? "text-rose-300" : "text-ink"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
