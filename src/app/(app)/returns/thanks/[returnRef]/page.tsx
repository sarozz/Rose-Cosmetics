import { notFound } from "next/navigation";
import { requireRole, RETURN_WRITE_ROLES } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { getReturn } from "@/lib/services/return";

export const metadata = { title: "Return complete — Rose Cosmetics" };

export default async function ReturnThanksPage({
  params,
}: {
  params: Promise<{ returnRef: string }>;
}) {
  await requireRole(RETURN_WRITE_ROLES);
  const { returnRef } = await params;
  const refund = await getReturn(returnRef);
  if (!refund) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Sales · Returns"
        title="Return complete"
        description={`Reference ${refund.returnRef} — refunded against sale ${refund.originalSale.saleRef} by ${refund.createdBy.displayName}.`}
        actions={
          <a href="/returns" className="btn-primary">
            Back to returns
          </a>
        }
      />

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3 text-right">Refund</th>
              <th className="px-4 py-3 text-center">Restocked</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {refund.items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 text-ink">
                  {item.saleItem.product.name}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                  {item.qty}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-medium text-ink">
                  {item.refundAmount.toString()}
                </td>
                <td className="px-4 py-3 text-center text-ink-soft">
                  {item.restockFlag ? "Yes" : "No"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 text-sm">
            <tr>
              <td colSpan={2} className="px-4 py-3 text-right font-semibold text-ink">
                Refund total
              </td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink">
                {refund.refundTotal.toString()}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {refund.reasonNote ? (
        <p className="mt-4 rounded-md bg-gray-50 px-4 py-3 text-sm text-ink-soft">
          <span className="font-medium text-ink">Reason:</span> {refund.reasonNote}
        </p>
      ) : null}
    </div>
  );
}
