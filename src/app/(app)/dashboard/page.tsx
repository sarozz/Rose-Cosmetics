import { hasRole, REPORT_VIEW_ROLES, requireUser } from "@/lib/auth";
import {
  lowStockCount,
  salesByDay,
  todaysSalesSummary,
  topProducts,
} from "@/lib/services/report";
import { SalesByDayChart, TopProductsChart } from "./charts";

export const metadata = { title: "Dashboard — Rose Cosmetics POS" };

export default async function DashboardPage() {
  const user = await requireUser();
  const canSeeReports = hasRole(user, REPORT_VIEW_ROLES);

  // Only fetch the aggregate numbers for users who can already see the full
  // reports page — cashiers shouldn't see the shop-wide totals.
  const [today, low, daily, top] = canSeeReports
    ? await Promise.all([
        todaysSalesSummary(),
        lowStockCount(),
        salesByDay(14),
        topProducts(30, 5),
      ])
    : [null, 0, [], []];

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8">
        <p className="text-sm font-medium uppercase tracking-wider text-rose-600">
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
          <section className="grid gap-4 sm:grid-cols-3">
            <StatCard
              title="Today&rsquo;s sales"
              value={today ? today.total.toString() : "0"}
              subtitle={`${today?.count ?? 0} transactions`}
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
      ? "text-rose-700"
      : tone === "ok"
        ? "text-emerald-700"
        : "text-ink";
  return (
    <a
      href={href}
      className="block rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:border-rose-200 hover:shadow"
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
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
        {title}
      </p>
      <p className="mt-2 text-sm text-ink">{body}</p>
    </div>
  );
}
