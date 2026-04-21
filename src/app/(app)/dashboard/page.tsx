import { hasRole, REPORT_VIEW_ROLES, requireUser } from "@/lib/auth";
import {
  lowStock,
  lowStockCount,
  paymentMethodSplit,
  revenueByCategory,
  salesByDay,
  todaysSalesSummary,
  topProducts,
  weekOverWeekRevenue,
} from "@/lib/services/report";
import {
  CategoryDonut,
  LowStockPreview,
  PaymentMethodSplit,
  SalesByDayChart,
  TopProductsChart,
} from "./charts";

export const metadata = { title: "Dashboard — Rose Cosmetics POS" };

export default async function DashboardPage() {
  const user = await requireUser();
  const canSeeReports = hasRole(user, REPORT_VIEW_ROLES);

  // Only fetch the aggregate numbers for users who can already see the full
  // reports page — cashiers shouldn't see the shop-wide totals.
  const [today, low, daily, top, wow, categories, payments, lowPreview] =
    canSeeReports
      ? await Promise.all([
          todaysSalesSummary(),
          lowStockCount(),
          salesByDay(14),
          topProducts(30, 5),
          weekOverWeekRevenue(),
          revenueByCategory(30, 5),
          paymentMethodSplit(30),
          lowStock(5),
        ])
      : [null, 0, [], [], null, [], [], []];

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8">
        <p className="text-sm font-medium uppercase tracking-wider text-rose-400">
          Dashboard
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">
          Welcome, {user.displayName}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          You&rsquo;re signed in as {user.role}.
        </p>
      </header>

      {canSeeReports ? (
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Today&rsquo;s sales"
              value={today ? today.total.toString() : "0"}
              subtitle={`${today?.count ?? 0} transactions`}
              href="/reports"
            />
            <TrendStatCard
              title="This week"
              value={wow ? wow.thisTotal : "0"}
              changePct={wow?.changePct ?? null}
              subtitle={`${wow?.thisCount ?? 0} sales · vs ${wow?.prevTotal ?? "0"}`}
              href="/reports"
            />
            <StatCard
              title="Low stock"
              value={String(low)}
              subtitle={
                low === 0
                  ? "Everything above reorder level"
                  : "Items at or below reorder level"
              }
              href="/reports"
              tone={low === 0 ? "ok" : "warn"}
            />
            <StatCard
              title="Ledger"
              value="Audit"
              subtitle="Every stock change, who, when"
              href="/reports/ledger"
            />
          </section>
          <section className="grid gap-4 lg:grid-cols-2">
            <SalesByDayChart data={daily} />
            <TopProductsChart data={top} />
          </section>
          <section className="grid gap-4 lg:grid-cols-3">
            <CategoryDonut data={categories} />
            <PaymentMethodSplit data={payments} />
            <LowStockPreview data={lowPreview} />
          </section>
        </div>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SimpleCard
            title="Point of sale"
            body={
              hasRole(user, ["CASHIER", "MANAGER", "OWNER"])
                ? "Scan barcodes and take cash from /pos."
                : "Ask a cashier to ring sales."
            }
          />
          <SimpleCard
            title="Receiving"
            body={
              hasRole(user, ["INVENTORY", "MANAGER", "OWNER"])
                ? "Record supplier receipts from /receiving."
                : "Stock intake is handled by the inventory team."
            }
          />
        </section>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  href,
  tone,
}: {
  title: string;
  value: string;
  subtitle: string;
  href: string;
  tone?: "ok" | "warn";
}) {
  const valueColor =
    tone === "warn"
      ? "text-rose-300"
      : tone === "ok"
        ? "text-emerald-300"
        : "text-ink";
  return (
    <a
      href={href}
      className="block rounded-lg border border-white/10 bg-card p-5 shadow-sm transition hover:border-rose-400/30 hover:shadow"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
        {title}
      </p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${valueColor}`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-ink-muted">{subtitle}</p>
    </a>
  );
}

function SimpleCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-card p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
        {title}
      </p>
      <p className="mt-2 text-sm text-ink">{body}</p>
    </div>
  );
}

/**
 * Stat card with a ↑/↓ arrow + coloured percent change. Null `changePct` means
 * the prior window was zero — we can't form a ratio, so we show an em-dash.
 */
function TrendStatCard({
  title,
  value,
  subtitle,
  changePct,
  href,
}: {
  title: string;
  value: string;
  subtitle: string;
  changePct: number | null;
  href: string;
}) {
  const up = changePct !== null && changePct > 0;
  const down = changePct !== null && changePct < 0;
  const badgeClass = up
    ? "bg-emerald-500/15 text-emerald-200"
    : down
      ? "bg-rose-500/15 text-rose-200"
      : "bg-white/5 text-ink-muted";
  const arrow = up ? "▲" : down ? "▼" : "–";
  const label =
    changePct === null ? "—" : `${Math.abs(changePct).toFixed(0)}%`;
  return (
    <a
      href={href}
      className="block rounded-lg border border-white/10 bg-card p-5 shadow-sm transition hover:border-rose-400/30 hover:shadow"
    >
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
          {title}
        </p>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums ${badgeClass}`}
        >
          {arrow} {label}
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-ink">
        {value}
      </p>
      <p className="mt-1 truncate text-xs text-ink-muted" title={subtitle}>
        {subtitle}
      </p>
    </a>
  );
}
