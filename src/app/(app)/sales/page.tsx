import Link from "next/link";
import type { Route } from "next";
import { requireRole, SALES_ROLES, RETURN_WRITE_ROLES, hasRole } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { listSales } from "@/lib/services/sale";

export const metadata = { title: "Sales — Rose Cosmetics" };

function paymentLabel(method: string): string {
  if (method === "CASH") return "Cash";
  if (method === "CARD") return "Card";
  if (method === "OTHER") return "Digital";
  return method;
}

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireRole(SALES_ROLES);
  const { q } = await searchParams;
  const sales = await listSales({ query: q, limit: 200 });
  const canRefund = hasRole(user, RETURN_WRITE_ROLES);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader
        eyebrow="Sales"
        title="Sales history"
        description="Every completed sale, newest first. Click Return to start a refund against a sale."
      />

      <form method="get" className="flex flex-wrap items-center gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by SR number or cashier name"
          className="block w-full max-w-md rounded-md border border-white/10 bg-surface/60 px-3 py-2 text-sm placeholder:text-ink-muted focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/30"
          autoComplete="off"
        />
        <button type="submit" className="btn-secondary">
          Search
        </button>
        {q ? (
          <Link href={"/sales" as Route} className="text-sm text-ink-muted hover:underline">
            Clear
          </Link>
        ) : null}
      </form>

      <div className="overflow-x-auto rounded-lg border border-white/10 bg-card">
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-4 py-3">SR number</th>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Cashier</th>
              <th className="px-4 py-3 text-right">Lines</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Paid via</th>
              <th className="px-4 py-3" aria-label="Actions" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sales.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-ink-muted">
                  {q ? `No sales match "${q}".` : "No sales yet."}
                </td>
              </tr>
            ) : (
              sales.map((s) => {
                const payments = Array.from(
                  new Set(s.payments.map((p) => paymentLabel(p.method))),
                ).join(" / ");
                return (
                  <tr key={s.id}>
                    <td className="px-4 py-3 font-mono text-xs text-ink">
                      {s.saleRef}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-soft">
                      {s.soldAt
                        .toISOString()
                        .replace("T", " ")
                        .slice(0, 16)}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {s.cashier.displayName}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                      {s._count.items}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-ink">
                      {s.total.toString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-soft">
                      {payments || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canRefund ? (
                        <Link
                          href={
                            `/returns/new?sale=${encodeURIComponent(s.saleRef)}` as Route
                          }
                          className="text-rose-300 hover:underline"
                        >
                          Return
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
