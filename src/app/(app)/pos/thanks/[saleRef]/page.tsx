import { notFound } from "next/navigation";
import { requireRole, SALES_ROLES } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { getSale } from "@/lib/services/sale";
import { PrintButton } from "./print-button";

export const metadata = { title: "Sale complete — Rose Cosmetics" };

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

      <article className="print-clean overflow-hidden rounded-lg border border-white/10 bg-card">
        <header className="hidden px-4 py-4 text-center print:block">
          <p className="text-lg font-semibold">Rose Cosmetics</p>
          <p className="mt-1 text-xs text-ink-muted">
            {soldAt} UTC · {sale.saleRef}
          </p>
          <p className="text-xs text-ink-muted">
            Cashier: {sale.cashier.displayName}
          </p>
        </header>

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

        <footer className="hidden px-4 py-4 text-center text-xs text-ink-muted print:block">
          Thank you for shopping with us.
        </footer>
      </article>
    </div>
  );
}
