import Link from "next/link";
import { notFound } from "next/navigation";
import { SALES_ROLES, requireRole } from "@/lib/auth";
import { getClose } from "@/lib/services/close";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Close detail — Rose Cosmetics POS" };

export default async function CloseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(SALES_ROLES);
  const { id } = await params;
  const close = await getClose(id);
  if (!close) notFound();

  const varianceNum = Number(close.variance);
  const varianceClass =
    varianceNum === 0
      ? "text-ink"
      : varianceNum > 0
        ? "text-emerald-300"
        : "text-rose-300";

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Sales · Day close"
        title="Close detail"
        description={`Recorded by ${close.closedBy.displayName} on ${formatDateTime(close.closedAt)}.`}
        actions={
          <Link href="/close" className="btn-secondary">
            Back to history
          </Link>
        }
      />

      <section className="rounded-lg border border-white/10 bg-card p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-rose-300">
          Period
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          {formatDateTime(close.periodStart)} → {formatDateTime(close.periodEnd)}
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label="Sales" value={String(close.salesCount)} />
          <Stat label="Cash sales" value={close.cashSalesTotal.toString()} />
          <Stat label="Digital sales" value={close.digitalSalesTotal.toString()} />
          <Stat label="Cash refunds" value={close.cashRefundsTotal.toString()} />
        </dl>
      </section>

      <section className="mt-4 rounded-lg border border-white/10 bg-card p-4">
        <dl className="space-y-2 text-sm">
          <Row label="Opening float" value={close.openingFloat.toString()} />
          <Row label="Expected cash" value={close.expectedCash.toString()} />
          <Row label="Counted" value={close.countedCash.toString()} />
          <div className="flex justify-between border-t border-white/10 pt-2 text-base">
            <dt className="font-semibold text-ink">Variance</dt>
            <dd className={`tabular-nums font-semibold ${varianceClass}`}>
              {formatVariance(close.variance.toString())}
            </dd>
          </div>
        </dl>
      </section>

      {close.notes ? (
        <section className="mt-4 rounded-lg border border-white/10 bg-card p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-rose-300">
            Notes
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-ink">
            {close.notes}
          </p>
        </section>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="tabular-nums font-medium text-ink">{value}</dd>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="tabular-nums text-ink">{value}</dd>
    </div>
  );
}

function formatDateTime(d: Date | string): string {
  const iso = typeof d === "string" ? d : d.toISOString();
  return iso.replace("T", " ").slice(0, 16);
}

function formatVariance(v: string): string {
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return "0.00";
  const sign = n > 0 ? "+" : "";
  return `${sign}${v}`;
}
