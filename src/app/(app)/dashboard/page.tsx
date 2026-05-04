import { Suspense } from "react";
import Link from "next/link";
import type { Route } from "next";
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
import { myTodaySummary, myMostRecentSale } from "@/lib/services/sale";
import { listCloses } from "@/lib/services/close";
import {
  CategoryDonut,
  LowStockPreview,
  PaymentMethodSplit,
  SalesByDayChart,
  TopProductsChart,
} from "./charts";

export const metadata = { title: "Dashboard — Rose Cosmetics POS" };

/**
 * The dashboard fans out into 8+ aggregate queries on first paint. Wrapping
 * each row in <Suspense> lets Next stream the page shell + header instantly
 * and hydrate each block as its data resolves — perceived speed jumps even
 * though the underlying queries take the same wall-clock time. The page
 * itself only awaits requireUser(); every fetch happens inside a streamed
 * server component.
 */
export default async function DashboardPage() {
  const user = await requireUser();
  const canSeeReports = hasRole(user, REPORT_VIEW_ROLES);
  const isCashier = user.role === "CASHIER";

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
          <Suspense fallback={<KpiRowSkeleton />}>
            <OwnerKpiRow />
          </Suspense>
          <Suspense fallback={<ChartsRowSkeleton />}>
            <OwnerChartsRow />
          </Suspense>
          <Suspense fallback={<BottomRowSkeleton />}>
            <OwnerBottomRow />
          </Suspense>
        </div>
      ) : isCashier ? (
        <div className="space-y-6">
          <Suspense fallback={<KpiRowSkeleton />}>
            <CashierStatsRow userId={user.id} />
          </Suspense>
          <CashierActionTiles />
          <Suspense fallback={<RecentSaleSkeleton />}>
            <CashierRecentSale userId={user.id} />
          </Suspense>
          <p className="rounded-lg border border-rose-400/20 bg-rose-500/5 p-4 text-sm text-ink-soft">
            <span className="font-semibold text-rose-300">Tip ·</span> scan a
            barcode anywhere in the app and it&rsquo;ll jump you to POS with
            the item already in the cart.
          </p>
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

/* --------------------------- Owner / manager rows ------------------------ */

async function OwnerKpiRow() {
  const [today, wow, low] = await Promise.all([
    todaysSalesSummary(),
    weekOverWeekRevenue(),
    lowStockCount(),
  ]);
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Today&rsquo;s sales"
        value={today.total.toString()}
        subtitle={`${today.count} transactions`}
        href="/reports"
      />
      <TrendStatCard
        title="This week"
        value={wow.thisTotal}
        changePct={wow.changePct}
        subtitle={`${wow.thisCount} sales · vs ${wow.prevTotal}`}
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
        href="/reports?section=ledger"
      />
    </section>
  );
}

async function OwnerChartsRow() {
  const [daily, top] = await Promise.all([salesByDay(14), topProducts(30, 5)]);
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <SalesByDayChart data={daily} />
      <TopProductsChart data={top} />
    </section>
  );
}

async function OwnerBottomRow() {
  const [categories, payments, lowPreview] = await Promise.all([
    revenueByCategory(30, 5),
    paymentMethodSplit(30),
    lowStock(5),
  ]);
  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <CategoryDonut data={categories} />
      <PaymentMethodSplit data={payments} />
      <LowStockPreview data={lowPreview} />
    </section>
  );
}

/* --------------------------------- Cashier ------------------------------- */

async function CashierStatsRow({ userId }: { userId: string }) {
  const [myToday, lastCloseRow] = await Promise.all([
    myTodaySummary(userId),
    listCloses({ limit: 1 }),
  ]);
  const lastClose = lastCloseRow[0] ?? null;
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="My sales today"
        value={String(myToday.count)}
        subtitle="Transactions you&rsquo;ve rung up so far"
        href="/pos"
      />
      <StatCard
        title="My revenue today"
        value={`Rs ${myToday.total}`}
        subtitle={
          myToday.count === 0
            ? "Open POS to ring your first sale."
            : "Combined value of today&rsquo;s sales."
        }
        href="/pos"
      />
      <StatCard
        title="Items sold today"
        value={String(myToday.itemCount)}
        subtitle="Total units across your sales"
        href="/pos"
      />
      <StatCard
        title="Last close"
        value={lastClose ? formatRelative(lastClose.closedAt) : "Never"}
        subtitle={
          lastClose
            ? `By ${lastClose.closedBy.displayName}`
            : "No closes yet — count the till at end of shift."
        }
        href="/close"
        tone={isCloseStale(lastClose?.closedAt) ? "warn" : undefined}
      />
    </section>
  );
}

function CashierActionTiles() {
  // Pure server-render — no data fetch — so it lands with the page shell.
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <ActionCard
        title="Open POS"
        body="Start ringing sales — barcode scan jumps here automatically."
        href="/pos"
        accent
      />
      <ActionCard
        title="Day close"
        body="Count the till at the end of your shift."
        href="/close/new"
      />
      <ActionCard
        title="Inventory"
        body="Browse what's on the shelves with live stock levels."
        href="/inventory"
      />
    </section>
  );
}

async function CashierRecentSale({ userId }: { userId: string }) {
  const sale = await myMostRecentSale(userId);
  if (!sale) return null;
  return (
    <section className="rounded-lg border border-white/10 bg-card p-5 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
          Most recent sale
        </p>
        <p className="text-xs text-ink-muted">
          {formatRelative(sale.soldAt)}
        </p>
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-4">
        <code className="font-mono text-base text-ink">{sale.saleRef}</code>
        <span className="tabular-nums text-base text-ink">
          Rs {sale.total.toString()}
        </span>
      </div>
    </section>
  );
}

/* ------------------------------- Skeletons ------------------------------- */

function KpiRowSkeleton() {
  return (
    <section
      aria-hidden
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </section>
  );
}

function ChartsRowSkeleton() {
  return (
    <section aria-hidden className="grid gap-4 lg:grid-cols-2">
      <CardSkeleton tall />
      <CardSkeleton tall />
    </section>
  );
}

function BottomRowSkeleton() {
  return (
    <section aria-hidden className="grid gap-4 lg:grid-cols-3">
      <CardSkeleton tall />
      <CardSkeleton tall />
      <CardSkeleton tall />
    </section>
  );
}

function RecentSaleSkeleton() {
  return (
    <section
      aria-hidden
      className="rounded-lg border border-white/10 bg-card p-5 shadow-sm"
    >
      <div className="h-3 w-32 animate-pulse rounded bg-white/5" />
      <div className="mt-3 flex justify-between gap-4">
        <div className="h-5 w-32 animate-pulse rounded bg-white/10" />
        <div className="h-5 w-20 animate-pulse rounded bg-white/10" />
      </div>
    </section>
  );
}

function CardSkeleton({ tall = false }: { tall?: boolean }) {
  return (
    <div
      className={`rounded-lg border border-white/10 bg-card p-5 shadow-sm ${
        tall ? "h-48" : ""
      }`}
    >
      <div className="h-3 w-24 animate-pulse rounded bg-white/5" />
      <div className="mt-3 h-7 w-32 animate-pulse rounded bg-white/10" />
      <div className="mt-2 h-3 w-40 animate-pulse rounded bg-white/5" />
    </div>
  );
}

/* ---------------------------- Card components ---------------------------- */

function ActionCard({
  title,
  body,
  href,
  accent,
}: {
  title: string;
  body: string;
  href: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href as Route}
      className={`block rounded-lg border p-5 shadow-sm transition hover:shadow ${
        accent
          ? "border-rose-400/40 bg-rose-500/10 hover:border-rose-400/60"
          : "border-white/10 bg-card hover:border-rose-400/30"
      }`}
    >
      <p
        className={`text-xs font-semibold uppercase tracking-wider ${
          accent ? "text-rose-200" : "text-rose-300"
        }`}
      >
        {title}
      </p>
      <p className="mt-2 text-sm text-ink">{body}</p>
    </Link>
  );
}

function isCloseStale(closedAt: Date | undefined): boolean {
  if (!closedAt) return true;
  const ageMs = Date.now() - new Date(closedAt).getTime();
  return ageMs > 18 * 60 * 60 * 1000;
}

function formatRelative(date: Date): string {
  const ms = Date.now() - new Date(date).getTime();
  const min = Math.round(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? "" : "s"} ago`;
  return new Date(date).toISOString().slice(0, 10);
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
