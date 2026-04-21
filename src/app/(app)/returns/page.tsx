import { hasRole, RETURN_WRITE_ROLES, requireUser } from "@/lib/auth";
import { listReturns } from "@/lib/services/return";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Returns — Rose Cosmetics" };

export default async function ReturnsPage() {
  const user = await requireUser();
  const returns = await listReturns();
  const canWrite = hasRole(user, RETURN_WRITE_ROLES);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Sales"
        title="Returns"
        description="Refunds against past sales. Restocked lines write an inventory ledger entry; damaged lines refund without touching stock."
        actions={
          canWrite ? (
            <a href="/returns/new" className="btn-primary">
              New return
            </a>
          ) : null
        }
      />

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Original sale</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Lines</th>
              <th className="px-4 py-3 text-right">Refund total</th>
              <th className="px-4 py-3">Processed by</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {returns.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-ink-muted"
                >
                  No returns yet.
                </td>
              </tr>
            ) : (
              returns.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-mono text-xs text-ink">
                    {r.returnRef}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-soft">
                    {r.originalSale.saleRef}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {formatDate(r.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                    {r._count.items}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-ink">
                    {r.refundTotal.toString()}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {r.createdBy.displayName}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
