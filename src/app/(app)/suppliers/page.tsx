import { CATALOG_WRITE_ROLES, hasRole, requireUser } from "@/lib/auth";
import { listSuppliers } from "@/lib/services/supplier";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Suppliers — Rose Cosmetics POS" };

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const suppliers = await listSuppliers({ query: params.q });
  const canWrite = hasRole(user, CATALOG_WRITE_ROLES);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Catalog"
        title="Suppliers"
        description="People and companies that stock the store."
        actions={
          canWrite ? (
            <a href="/suppliers/new" className="btn-primary">
              Add supplier
            </a>
          ) : null
        }
      />

      <form className="mb-4 flex gap-2" action="/suppliers" method="get">
        <input
          type="search"
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search by name or email"
          className="flex-1 rounded-md border border-white/10 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/30"
        />
        <button type="submit" className="btn-secondary">
          Search
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-white/10 bg-card">
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Terms</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" aria-label="Actions" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {suppliers.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-ink-muted"
                >
                  No suppliers yet.
                </td>
              </tr>
            ) : (
              suppliers.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-medium text-ink">{s.name}</td>
                  <td className="px-4 py-3 text-ink-soft">
                    {s.email || s.phone || "—"}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {s.defaultTerms || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge isActive={s.isActive} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canWrite ? (
                      <a
                        href={`/suppliers/${s.id}/edit`}
                        className="text-rose-300 hover:underline"
                      >
                        Edit
                      </a>
                    ) : null}
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

function StatusBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-200">
      Active
    </span>
  ) : (
    <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-ink-muted">
      Inactive
    </span>
  );
}
