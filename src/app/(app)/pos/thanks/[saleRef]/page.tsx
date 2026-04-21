import { notFound } from "next/navigation";
import { requireRole, SALES_ROLES } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { RoseLogo } from "@/components/rose-logo";
import { getSale } from "@/lib/services/sale";
import { PrintButton } from "./print-button";

export const metadata = { title: "Sale complete — Rose Cosmetics" };

// Scoped to this route so generic Ctrl+P from other pages keeps its A4
// defaults — the @page rule only ships in the thanks page's HTML.
const THERMAL_PRINT_CSS = `
@media print {
  @page { size: 80mm auto; margin: 3mm; }
  html, body { width: 80mm; }
  .thermal-receipt {
    font-family: "Courier New", ui-monospace, SFMono-Regular, monospace;
    font-size: 10pt;
    line-height: 1.3;
    color: #000;
  }
  .thermal-receipt .divider {
    border-top: 1px dashed #000;
    margin: 6px 0;
  }
}`;

export default async function SaleThanksPage({
  params,
}: {
  params: Promise<{ saleRef: string }>;
}) {
  await requireRole(SALES_ROLES);
  const { saleRef } = await params;
  const sale = await getSale(saleRef);
  if (!sale) notFound();

  const soldAt = sale.soldAt
    .toISOString()
    .replace("T", " ")
    .slice(0, 19);

  return (
    <>
      <style>{THERMAL_PRINT_CSS}</style>
      <div className="mx-auto max-w-2xl">
        <div className="no-print">
          <PageHeader
            eyebrow="Sales"
            title="Sale complete"
            description={`Reference ${sale.saleRef} — recorded by ${sale.cashier.displayName}.`}
            actions={
              <div className="flex gap-2">
                <PrintButton />
                <a href="/pos" className="btn-primary">
                  New sale
                </a>
              </div>
            }
          />
        </div>

        <article className="overflow-hidden rounded-lg border border-white/10 bg-card print:hidden">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">Unit</th>
                <th className="px-4 py-3 text-right">Line</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sale.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-ink">{item.product.name}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                    {item.qty}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                    {item.unitPrice.toString()}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-ink">
                    {item.lineTotal.toString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-surface text-sm">
              <tr>
                <td colSpan={3} className="px-4 py-2 text-right text-ink-muted">
                  Subtotal
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-ink">
                  {sale.subtotal.toString()}
                </td>
              </tr>
              {!sale.discount.equals(0) ? (
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-right text-ink-muted">
                    Discount
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-ink">
                    -{sale.discount.toString()}
                  </td>
                </tr>
              ) : null}
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-3 text-right text-base font-semibold text-ink"
                >
                  Total
                </td>
                <td className="px-4 py-3 text-right text-base font-semibold tabular-nums text-ink">
                  {sale.total.toString()}
                </td>
              </tr>
              {sale.payments.map((p) => (
                <tr key={p.id}>
                  <td colSpan={3} className="px-4 py-2 text-right text-ink-muted">
                    Paid — {p.method}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-ink-soft">
                    {p.amount.toString()}
                  </td>
                </tr>
              ))}
            </tfoot>
          </table>
        </article>

        {/* 80mm thermal layout. Single column, monospace, hidden on screen. */}
        <article className="thermal-receipt print-clean hidden px-1 print:block">
          <header className="text-center">
            <div className="flex justify-center">
              <RoseLogo size="sm" />
            </div>
            <div className="mt-1">{soldAt} UTC</div>
            <div>Ref: {sale.saleRef}</div>
            <div>Cashier: {sale.cashier.displayName}</div>
          </header>

          <div className="divider" />

          <ul>
            {sale.items.map((item) => (
              <li key={item.id} className="mb-1">
                <div>{item.product.name}</div>
                <div className="flex justify-between">
                  <span>
                    {item.qty} × {item.unitPrice.toString()}
                  </span>
                  <span>{item.lineTotal.toString()}</span>
                </div>
              </li>
            ))}
          </ul>

          <div className="divider" />

          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{sale.subtotal.toString()}</span>
          </div>
          {!sale.discount.equals(0) ? (
            <div className="flex justify-between">
              <span>Discount</span>
              <span>-{sale.discount.toString()}</span>
            </div>
          ) : null}
          <div
            className="mt-1 flex justify-between font-bold"
            style={{ fontSize: "12pt" }}
          >
            <span>TOTAL</span>
            <span>{sale.total.toString()}</span>
          </div>
          {sale.payments.map((p) => (
            <div key={p.id} className="flex justify-between">
              <span>Paid ({p.method})</span>
              <span>{p.amount.toString()}</span>
            </div>
          ))}

          <div className="divider" />

          <footer className="text-center">
            Thank you for shopping with us.
          </footer>
        </article>
      </div>
    </>
  );
}
