import Link from "next/link";
import { REPORT_VIEW_ROLES, requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { PrintButton } from "@/components/print-button";
import { supplierFinancialRollup } from "@/lib/services/supplier-report";

export const metadata = { title: "Supplier ledger — Rose Cosmetics" };

function fmt(s: string): string {
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

export default async function SupplierReportPage() {
  await requireRole(REPORT_VIEW_ROLES);
  const rows = await supplierFinancialRollup();

  const totals = rows.reduce(
    (acc, r) => ({
      receipts: acc.receipts + r.receipts,
      totalCost: acc.totalCost + Number(r.totalCost),
      debited: acc.debited + Number(r.debited),
      credit: acc.credit + Number(r.credit),
      vat: acc.vat + Number(r.vat),
      discount: acc.discount + Number(r.discount),
    }),
    { receipts: 0, totalCost: 0, debited: 0, credit: 0, vat: 0, discount: 0 },
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Reports"
        title="Supplier ledger"
        description="Per-supplier purchases, what's been paid, and what's still owed. Sorted by outstanding credit so the most pressing balances surface first."
        actions={
          <div className="flex flex-wrap gap-2">
            <PrintButton label="Print" />
            <a
              href="/reports/download?kind=suppliers"
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

      {/* Print-only banner. */}
      <div className="hidden print:mb-4 print:block" aria-hidden>
        <h1 className="text-2xl font-semibold text-black">
          Rose Cosmetics — Supplier ledger ·{" "}
          {new Date().toISOString().slice(0, 10)}
        </h1>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Suppliers" value={String(rows.length)} />
        <Stat label="Receipts" value={totals.receipts.toLocaleString()} />
        <Stat label="Purchased" value={`Rs ${fmt(totals.totalCost.toFixed(2))}`} />
        <Stat
          label="Paid (debited)"
          value={`Rs ${fmt(totals.debited.toFixed(2))}`}
          tone="ok"
        />
        <Stat
          label="Outstanding (credit)"
          value={`Rs ${fmt(totals.credit.toFixed(2))}`}
          tone={totals.credit > 0 ? "warn" : "ok"}
        />
      </section>

      <section className="overflow-x-auto rounded-lg border border-white/10 bg-card shadow-sm">
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3 text-right">Receipts</th>
              <th className="px-4 py-3 text-right">Purchased</th>
              <th className="px-4 py-3 text-right">Debited</th>
              <th className="px-4 py-3 text-right">Credit</th>
              <th className="px-4 py-3 text-right">VAT</th>
              <th className="px-4 py-3 text-right">Discount</th>
              <th className="px-4 py-3">Last receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-ink-muted">
                  No supplier activity yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const credit = Number(r.credit);
                const creditClass =
                  credit > 0 ? "text-amber-300" : "text-ink-muted";
                return (
                  <tr key={r.supplierId}>
                    <td className="px-4 py-3 font-medium text-ink">
                      {r.supplierName}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                      {r.receipts}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-ink">
                      {fmt(r.totalCost)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-emerald-300">
                      {fmt(r.debited)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right tabular-nums font-medium ${creditClass}`}
                    >
                      {fmt(r.credit)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                      {fmt(r.vat)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                      {fmt(r.discount)}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {fmtDate(r.lastPurchaseAt)}
                    </td>
                  </tr>
                );
              })
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
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn";
}) {
  const valueClass =
    tone === "warn"
      ? "text-amber-300"
      : tone === "ok"
        ? "text-emerald-300"
        : "text-ink";
  return (
    <div className="rounded-lg border border-white/10 bg-card p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wider text-ink-muted">
        {label}
      </div>
      <div className={`mt-1 text-xl font-semibold tabular-nums ${valueClass}`}>
        {value}
      </div>
    </div>
  );
}
