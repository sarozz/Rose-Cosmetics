import Link from "next/link";
import { REPORT_VIEW_ROLES, requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { PrintButton } from "@/components/print-button";
import {
  parseMonthValue,
  recentMonthOptions,
  staffPerformanceForMonth,
} from "@/lib/services/staff-performance";

export const metadata = { title: "Staff performance — Rose Cosmetics" };

const ROLE_TONE: Record<string, string> = {
  OWNER: "bg-rose-500/15 text-rose-200",
  MANAGER: "bg-amber-500/15 text-amber-200",
  CASHIER: "bg-emerald-500/15 text-emerald-200",
  INVENTORY: "bg-sky-500/15 text-sky-200",
};

function formatAmount(s: string): string {
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default async function StaffPerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await requireRole(REPORT_VIEW_ROLES);
  const params = await searchParams;
  const months = recentMonthOptions(12);
  const { year, monthIndex, value: selectedMonth } = parseMonthValue(
    params.month,
  );
  const rows = await staffPerformanceForMonth(year, monthIndex);

  const totals = rows.reduce(
    (acc, r) => ({
      sales: acc.sales + r.salesCount,
      items: acc.items + r.itemsSold,
      revenue: acc.revenue + Number(r.revenue),
    }),
    { sales: 0, items: 0, revenue: 0 },
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Reports"
        title="Staff performance"
        description="Per-cashier sales for the selected month — revenue, items, average sale, and best-selling product."
        actions={
          <div className="flex flex-wrap gap-2">
            <PrintButton label="Print" />
            <a
              href={`/reports/download?kind=staff&month=${selectedMonth}`}
              download
              className="btn-secondary text-sm"
            >
              Download CSV
            </a>
            <Link href="/reports" className="btn-secondary">
              Back to reports
            </Link>
          </div>
        }
      />

      {/* Month picker — server form so it works without JS. */}
      <form
        method="get"
        action="/reports/staff"
        className="no-print flex flex-wrap items-center gap-3"
      >
        <label
          htmlFor="month"
          className="text-xs font-medium uppercase tracking-wider text-ink-muted"
        >
          Month
        </label>
        <select
          id="month"
          name="month"
          defaultValue={selectedMonth}
          className="rounded-md border border-white/10 bg-surface/60 px-3 py-2 text-sm text-ink hover:border-white/20 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/30"
        >
          {months.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-secondary text-sm">
          Show
        </button>
      </form>

      {/* Print-only header so the printed report tells you which month it is. */}
      <div
        className="hidden print:mb-4 print:block"
        aria-hidden
      >
        <h1 className="text-2xl font-semibold text-black">
          Rose Cosmetics — Staff performance ·{" "}
          {months.find((m) => m.value === selectedMonth)?.label ?? selectedMonth}
        </h1>
      </div>

      <section className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Stat label="Total revenue" value={`Rs ${formatAmount(totals.revenue.toFixed(2))}`} accent />
        <Stat label="Sales" value={totals.sales.toLocaleString()} />
        <Stat label="Items sold" value={totals.items.toLocaleString()} />
        <Stat label="Active cashiers" value={String(rows.length)} />
      </section>

      <section className="overflow-x-auto rounded-lg border border-white/10 bg-card shadow-sm">
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Staff</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3 text-right">Sales</th>
              <th className="px-4 py-3 text-right">Items</th>
              <th className="px-4 py-3 text-right">Revenue</th>
              <th className="px-4 py-3 text-right">Avg sale</th>
              <th className="px-4 py-3">Top product</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center text-ink-muted"
                >
                  No sales recorded in this month yet.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={r.cashierId}>
                  <td className="px-4 py-3 text-xs text-ink-muted tabular-nums">
                    {i + 1}
                  </td>
                  <td className="px-4 py-3 font-medium text-ink">
                    {r.displayName}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        ROLE_TONE[r.role] ?? "bg-surface text-ink-muted"
                      }`}
                    >
                      {r.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {r.salesCount}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {r.itemsSold}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-ink">
                    {formatAmount(r.revenue)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                    {formatAmount(r.averageSale)}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {r.topProductName ? (
                      <>
                        <span className="text-ink">{r.topProductName}</span>
                        <span className="ml-2 text-xs text-ink-muted tabular-nums">
                          × {r.topProductQty}
                        </span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-card p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wider text-ink-muted">
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
