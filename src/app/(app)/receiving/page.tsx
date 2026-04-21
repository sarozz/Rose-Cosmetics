import { hasRole, INVENTORY_WRITE_ROLES, requireUser } from "@/lib/auth";
import { listPurchases } from "@/lib/services/purchase";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Receiving — Rose Cosmetics POS" };

export default async function ReceivingPage() {
  const user = await requireUser();
  const purchases = await listPurchases();
  const canWrite = hasRole(user, INVENTORY_WRITE_ROLES);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Inventory"
        title="Receiving"
        description="Record stock received from suppliers. Every line writes an inventory ledger row."
        actions={
          canWrite ? (
            <a href="/receiving/new" className="btn-primary">
              Record receipt
            </a>
          ) : null
        }
      />

      <div className="overflow-hidden rounded-lg border border-white/10 bg-card">
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3 text-right">Lines</th>
              <th className="px-4 py-3 text-right">Total cost</th>
              <th className="px-4 py-3">Recorded by</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {purchases.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-ink-muted"
                >
                  No receipts yet.
                </td>
              </tr>
            ) : (
              purchases.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-mono text-xs text-ink">
                    {p.purchaseRef}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {formatDate(p.purchaseDate)}
                  </td>
                  <td className="px-4 py-3 text-ink">{p.supplier.name}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                    {p._count.items}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-ink">
                    {p.totalCost.toString()}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {p.createdBy.displayName}
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
