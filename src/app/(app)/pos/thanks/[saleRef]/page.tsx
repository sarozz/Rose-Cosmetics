import { notFound } from "next/navigation";
import { requireRole, SALES_ROLES } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { getSale } from "@/lib/services/sale";

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

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Sales"
        title="Sale complete"
        description={`Reference ${sale.saleRef} — recorded by ${sale.cashier.displayName}.`}
        actions={
          <a href="/pos" className="btn-primary">
            New sale
          </a>
        }
      />

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3 text-right">Unit</th>
              <th className="px-4 py-3 text-right">Line</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
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
          <tfoot className="bg-gray-50 text-sm">
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
      </div>
    </div>
  );
}
