import Link from "next/link";
import type { Route } from "next";
import { REPORT_VIEW_ROLES, SALES_ROLES, hasRole, requireUser } from "@/lib/auth";
import { listCloses } from "@/lib/services/close";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Day close — Rose Cosmetics POS" };

export default async function ClosePage() {
  const user = await requireUser();
  const canView = hasRole(user, REPORT_VIEW_ROLES);
  const canClose = hasRole(user, SALES_ROLES);

  // Cashiers don't need to see history; they just run a close.
  const closes = canView ? await listCloses() : [];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Sales"
        title="Day close"
        description="End-of-shift cash count. Expected cash is opening float plus cash sales minus cash refunds; variance is what you counted minus what was expected."
        actions={
          canClose ? (
            <Link href="/close/new" className="btn-primary">
              New close
            </Link>
          ) : null
        }
      />

      {canView ? (
        <div className="overflow-hidden rounded-lg border border-white/10 bg-card">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-4 py-3">Closed at</th>
                <th className="px-4 py-3">By</th>
                <th className="px-4 py-3 text-right">Sales</th>
                <th className="px-4 py-3 text-right">Cash sales</th>
                <th className="px-4 py-3 text-right">Expected</th>
                <th className="px-4 py-3 text-right">Counted</th>
                <th className="px-4 py-3 text-right">Variance</th>
                <th className="px-4 py-3" aria-label="Detail" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {closes.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-ink-muted"
                  >
                    No closes yet.
                  </td>
                </tr>
              ) : (
                closes.map((c) => {
                  const varianceNum = Number(c.variance);
                  const varianceClass =
                    varianceNum === 0
                      ? "text-ink"
                      : varianceNum > 0
                        ? "text-emerald-300"
                        : "text-rose-300";
                  return (
                    <tr key={c.id}>
                      <td className="px-4 py-3 text-ink">
                        {formatDateTime(c.closedAt)}
                      </td>
                      <td className="px-4 py-3 text-ink-soft">
                        {c.closedBy.displayName}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                        {c.salesCount}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                        {c.cashSalesTotal.toString()}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                        {c.expectedCash.toString()}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-ink">
                        {c.countedCash.toString()}
                      </td>
                      <td
                        className={`px-4 py-3 text-right tabular-nums font-medium ${varianceClass}`}
                      >
                        {formatVariance(c.variance.toString())}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/close/${c.id}` as Route}
                          className="text-rose-300 hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-lg border border-white/10 bg-card p-6 text-sm text-ink-muted">
          Use the <strong className="text-ink">New close</strong> button to
          count the till at end of shift. Close history is visible to
          owners and managers.
        </p>
      )}
    </div>
  );
}

function formatDateTime(d: Date): string {
  return d.toISOString().replace("T", " ").slice(0, 16);
}

function formatVariance(v: string): string {
  const n = Number(v);
  if (n === 0) return "0.00";
  const sign = n > 0 ? "+" : "";
  return `${sign}${v}`;
}
