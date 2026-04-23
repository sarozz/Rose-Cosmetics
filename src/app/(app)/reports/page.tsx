import Link from "next/link";
import { requireRole, REPORT_VIEW_ROLES } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import {
  lowStock,
  paymentMethodSplit,
  periodSummary,
  salesByDay,
  salesByMonth,
  salesByWeek,
  topProducts,
  type ReportRange,
} from "@/lib/services/report";

export const metadata = { title: "Reports — Rose Cosmetics" };

const RANGE_LABEL: Record<ReportRange, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

const WINDOW_LABEL: Record<ReportRange, string> = {
  daily: "last 30 days",
  weekly: "last 12 weeks",
  monthly: "last 12 months",
};

const KPI_LABEL: Record<ReportRange, string> = {
  daily: "today",
  weekly: "this week",
  monthly: "this month",
};

const KPI_PREV_LABEL: Record<ReportRange, string> = {
  daily: "yesterday",
  weekly: "last week",
  monthly: "last month",
};

const WINDOW_DAYS: Record<ReportRange, number> = {
  daily: 30,
  weekly: 84,
  monthly: 365,
};

function parseRange(raw: string | undefined): ReportRange {
  if (raw === "weekly" || raw === "monthly") return raw;
  return "daily";
}

function formatAmount(n: string | number): string {
  const num = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(num)) return String(n);
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDateLabel(date: string, range: ReportRange): string {
  if (range === "daily") return date;
  if (range === "weekly") return `Week of ${date}`;
  // monthly — date is YYYY-MM-01
  return date.slice(0, 7);
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireRole(REPORT_VIEW_ROLES);
  const params = await searchParams;
  const range = parseRange(params.range);

  const [summary, series, top, payments, low] = await Promise.all([
    periodSummary(range),
    range === "weekly"
      ? salesByWeek(12)
      : range === "monthly"
        ? salesByMonth(12)
        : salesByDay(30),
    topProducts(WINDOW_DAYS[range], 10),
    paymentMethodSplit(WINDOW_DAYS[range]),
    lowStock(50),
  ]);

  const paymentsTotal = payments.reduce(
    (sum, p) => sum + Number(p.total),
    0,
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        eyebrow="Reports"
        title="Sales analytics"
        description="Track revenue, best-sellers, and stock health. Switch period up top — every table exports to CSV."
        actions={
          <div className="flex gap-2">
            <Link href="/reports/profit" className="btn-secondary">
              Profit & inventory
            </Link>
            <Link href="/reports/ledger" className="btn-secondary">
              Inventory ledger
            </Link>
          </div>
        }
      />

      <RangeToggle current={range} />

      <section
        aria-label="Key metrics"
        className="grid grid-cols-2 gap-3 md:grid-cols-4"
      >
        <KpiCard
          label={`Revenue · ${KPI_LABEL[range]}`}
          value={`Rs ${formatAmount(summary.currentTotal)}`}
          accent
        />
        <KpiCard
          label={`Transactions · ${KPI_LABEL[range]}`}
          value={summary.currentCount.toLocaleString()}
        />
        <KpiCard
          label="Average sale"
          value={`Rs ${formatAmount(summary.averageSale)}`}
        />
        <KpiCard
          label={`vs ${KPI_PREV_LABEL[range]}`}
          value={formatDelta(summary.deltaPct)}
          tone={getDeltaTone(summary.deltaPct)}
          sub={`Rs ${formatAmount(summary.previousTotal)} prev.`}
        />
      </section>

      <section>
        <SectionHeader
          title={`Sales · ${WINDOW_LABEL[range]}`}
          csvHref={`/reports/download?kind=sales&range=${range}`}
          csvLabel="Download sales CSV"
        />
        <RevenueChart
          series={series}
          range={range}
          emptyMessage="No sales recorded in this window yet."
        />
        <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-card shadow-sm">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-4 py-3">
                  {range === "daily"
                    ? "Date"
                    : range === "weekly"
                      ? "Week"
                      : "Month"}
                </th>
                <th className="px-4 py-3 text-right">Transactions</th>
                <th className="px-4 py-3 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {series.map((row) => {
                const empty = row.count === 0;
                return (
                  <tr
                    key={row.date}
                    className={empty ? "text-ink-muted" : "text-ink"}
                  >
                    <td className="px-4 py-2 font-mono text-xs">
                      {formatDateLabel(row.date, range)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {row.count}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-medium">
                      {formatAmount(row.total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <SectionHeader
          title={`Top products · ${WINDOW_LABEL[range]}`}
          csvHref={`/reports/download?kind=top-products&range=${range}`}
          csvLabel="Download top products CSV"
        />
        <div className="overflow-hidden rounded-xl border border-white/10 bg-card shadow-sm">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3 text-right">Units sold</th>
                <th className="px-4 py-3 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {top.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-ink-muted"
                  >
                    No sales recorded in this window yet.
                  </td>
                </tr>
              ) : (
                top.map((p, i) => (
                  <tr key={p.productId}>
                    <td className="px-4 py-3 text-xs text-ink-muted tabular-nums">
                      {i + 1}
                    </td>
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
                      {formatAmount(p.revenue)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <SectionHeader
          title={`Payment mix · ${WINDOW_LABEL[range]}`}
          csvHref={`/reports/download?kind=payments&range=${range}`}
          csvLabel="Download payments CSV"
        />
        {payments.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-card p-6 text-center text-sm text-ink-muted">
            No payments recorded in this window.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {payments.map((p) => {
              const total = Number(p.total);
              const pct =
                paymentsTotal > 0 ? (total / paymentsTotal) * 100 : 0;
              return (
                <div
                  key={p.method}
                  className="rounded-xl border border-white/10 bg-card p-4 shadow-sm"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs uppercase tracking-wider text-ink-muted">
                      {paymentMethodLabel(p.method)}
                    </span>
                    <span className="text-xs text-ink-muted tabular-nums">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-1 text-xl font-semibold tabular-nums text-ink">
                    Rs {formatAmount(p.total)}
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface">
                    <div
                      className="h-full rounded-full bg-rose-400"
                      style={{ width: `${Math.min(100, pct)}%` }}
                      aria-hidden
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <SectionHeader
          title="Low stock"
          csvHref="/reports/download?kind=low-stock"
          csvLabel="Download low-stock CSV"
        />
        <div className="overflow-hidden rounded-xl border border-white/10 bg-card shadow-sm">
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
                  <td
                    colSpan={3}
                    className="px-4 py-10 text-center text-ink-muted"
                  >
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

function RangeToggle({ current }: { current: ReportRange }) {
  const ranges: ReportRange[] = ["daily", "weekly", "monthly"];
  return (
    <div
      role="tablist"
      aria-label="Report range"
      className="inline-flex rounded-lg border border-white/10 bg-card p-1 text-sm"
    >
      {ranges.map((r) => {
        const selected = current === r;
        return (
          <Link
            key={r}
            role="tab"
            aria-selected={selected}
            href={{ pathname: "/reports", query: { range: r } }}
            className={`rounded-md px-4 py-1.5 font-medium transition-colors ${
              selected
                ? "bg-rose-500/15 text-rose-200"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            {RANGE_LABEL[r]}
          </Link>
        );
      })}
    </div>
  );
}

function KpiCard({
  label,
  value,
  accent,
  tone,
  sub,
}: {
  label: string;
  value: string;
  accent?: boolean;
  tone?: "up" | "down";
  sub?: string;
}) {
  const valueClass = accent
    ? "text-rose-300"
    : tone === "up"
      ? "text-emerald-300"
      : tone === "down"
        ? "text-rose-300"
        : "text-ink";
  return (
    <div className="rounded-xl border border-white/10 bg-card p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wider text-ink-muted">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${valueClass}`}>
        {value}
      </div>
      {sub ? (
        <div className="mt-1 text-xs text-ink-muted tabular-nums">{sub}</div>
      ) : null}
    </div>
  );
}

function SectionHeader({
  title,
  csvHref,
  csvLabel,
}: {
  title: string;
  csvHref: string;
  csvLabel: string;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <a
        href={csvHref}
        download
        aria-label={csvLabel}
        className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-surface px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-white/20 hover:text-ink"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
          <path
            d="M12 4v11m0 0 4-4m-4 4-4-4M5 20h14"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Download CSV
      </a>
    </div>
  );
}

function RevenueChart({
  series,
  range,
  emptyMessage,
}: {
  series: Array<{ date: string; count: number; total: string }>;
  range: ReportRange;
  emptyMessage: string;
}) {
  // Chart draws oldest → newest left → right so the trend reads naturally.
  // Series comes newest-first from the service, so reverse for the chart only.
  const ordered = [...series].reverse();
  const max = ordered.reduce(
    (acc, r) => Math.max(acc, Number(r.total) || 0),
    0,
  );
  if (max <= 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-card p-6 text-center text-sm text-ink-muted">
        {emptyMessage}
      </div>
    );
  }
  const viewW = 600;
  const viewH = 120;
  const gap = 2;
  const barW = (viewW - gap * (ordered.length - 1)) / ordered.length;
  return (
    <figure className="rounded-xl border border-white/10 bg-card p-4 shadow-sm">
      <svg
        viewBox={`0 0 ${viewW} ${viewH}`}
        className="h-32 w-full"
        role="img"
        aria-label={`Revenue by ${range === "daily" ? "day" : range === "weekly" ? "week" : "month"}`}
      >
        {ordered.map((row, i) => {
          const v = Number(row.total) || 0;
          const h = max === 0 ? 0 : (v / max) * (viewH - 8);
          const x = i * (barW + gap);
          const y = viewH - h;
          return (
            <rect
              key={row.date}
              x={x}
              y={y}
              width={barW}
              height={h}
              rx={2}
              className="fill-rose-400/70"
            >
              <title>
                {formatDateLabel(row.date, range)} — Rs {formatAmount(row.total)} · {row.count} txn
              </title>
            </rect>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex justify-between text-xs text-ink-muted">
        <span>{formatDateLabel(ordered[0].date, range)}</span>
        <span>{formatDateLabel(ordered[ordered.length - 1].date, range)}</span>
      </figcaption>
    </figure>
  );
}

function formatDelta(deltaPct: string | null): string {
  if (deltaPct === null) return "—";
  const n = Number(deltaPct);
  if (!Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

function getDeltaTone(deltaPct: string | null): "up" | "down" | undefined {
  if (deltaPct === null) return undefined;
  const n = Number(deltaPct);
  if (!Number.isFinite(n) || n === 0) return undefined;
  return n > 0 ? "up" : "down";
}

function paymentMethodLabel(method: string): string {
  if (method === "CASH") return "Cash";
  if (method === "CARD") return "Card";
  if (method === "OTHER") return "Digital";
  return method;
}
