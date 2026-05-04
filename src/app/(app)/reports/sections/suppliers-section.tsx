import Link from "next/link";
import { PrintButton } from "@/components/print-button";
import {
  supplierFinancialRollup,
  supplierHistory,
} from "@/lib/services/supplier-report";

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

/**
 * Suppliers section. When `supplierId` is omitted we render the rollup
 * across all suppliers; when present we drill into that supplier's full
 * receipt history with print + CSV.
 */
export async function SuppliersSection({
  supplierId,
}: {
  supplierId?: string;
}) {
  if (supplierId) {
    return <SupplierDrill supplierId={supplierId} />;
  }
  return <SupplierRollup />;
}

async function SupplierRollup() {
  const rows = await supplierFinancialRollup();

  const totals = rows.reduce(
    (acc, r) => ({
      receipts: acc.receipts + r.receipts,
      totalCost: acc.totalCost + Number(r.totalCost),
      debited: acc.debited + Number(r.debited),
      credit: acc.credit + Number(r.credit),
    }),
    { receipts: 0, totalCost: 0, debited: 0, credit: 0 },
  );

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          Per-supplier purchases, what&apos;s been paid, and what&apos;s still owed.
          Click a supplier to drill into their full history.
        </p>
        <div className="flex gap-2">
          <PrintButton label="Print" />
          <a
            href="/reports/download?kind=suppliers"
            download
            className="btn-secondary text-sm"
          >
            Download CSV
          </a>
        </div>
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
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/reports?section=suppliers&supplier=${r.supplierId}` as never}
                        className="text-rose-300 hover:underline"
                      >
                        {r.supplierName}
                      </Link>
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

async function SupplierDrill({ supplierId }: { supplierId: string }) {
  const result = await supplierHistory(supplierId);
  if (!result.supplier) {
    return (
      <div className="rounded-lg border border-white/10 bg-card p-6 text-sm text-ink-muted">
        Supplier not found.{" "}
        <Link
          href="/reports?section=suppliers"
          className="text-rose-300 hover:underline"
        >
          Back to all suppliers
        </Link>
      </div>
    );
  }
  const s = result.supplier;
  const t = result.totals;

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/reports?section=suppliers"
          className="text-sm text-rose-300 hover:underline"
        >
          ← All suppliers
        </Link>
        <div className="flex gap-2">
          <PrintButton label="Print history" />
        </div>
      </div>

      <header className="rounded-lg border border-white/10 bg-card p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-ink">{s.name}</h2>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
          {s.phone ? <span>📞 {s.phone}</span> : null}
          {s.email ? <span>✉ {s.email}</span> : null}
          {s.defaultTerms ? <span>Terms · {s.defaultTerms}</span> : null}
        </div>
      </header>

      {/* Print-only banner */}
      <div className="hidden print:mb-4 print:block" aria-hidden>
        <h1 className="text-2xl font-semibold text-black">
          Rose Cosmetics — {s.name} · receipt history
        </h1>
        <p className="text-sm text-black/70">
          Generated {new Date().toISOString().slice(0, 10)}
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Receipts" value={String(t.receipts)} />
        <Stat label="Purchased" value={`Rs ${fmt(t.totalCost)}`} />
        <Stat label="Debited" value={`Rs ${fmt(t.debited)}`} tone="ok" />
        <Stat
          label="Outstanding"
          value={`Rs ${fmt(t.credit)}`}
          tone={Number(t.credit) > 0 ? "warn" : "ok"}
        />
        <Stat
          label="VAT / Discount"
          value={`${fmt(t.vat)} / ${fmt(t.discount)}`}
        />
      </section>

      <section className="overflow-x-auto rounded-lg border border-white/10 bg-card shadow-sm">
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3 text-right">Lines</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Debited</th>
              <th className="px-4 py-3 text-right">Credit</th>
              <th className="px-4 py-3 text-right">VAT</th>
              <th className="px-4 py-3 text-right">Discount</th>
              <th className="px-4 py-3">Recorded by</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {result.receipts.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-ink-muted">
                  No receipts on file for this supplier.
                </td>
              </tr>
            ) : (
              result.receipts.map((r) => {
                const credit = Number(r.credit);
                const creditClass =
                  credit > 0 ? "text-amber-300" : "text-ink-muted";
                return (
                  <tr key={r.id}>
                    <td className="px-4 py-3 text-ink-soft">
                      {r.purchaseDate.slice(0, 10)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink">
                      {r.purchaseRef}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                      {r.lines}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-ink">
                      {fmt(r.totalCost)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-emerald-300">
                      {fmt(r.debited)}
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums ${creditClass}`}>
                      {fmt(r.credit)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                      {fmt(r.vat)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                      {fmt(r.discount)}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{r.recordedBy}</td>
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
