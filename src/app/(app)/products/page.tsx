import { CATALOG_WRITE_ROLES, hasRole, requireUser } from "@/lib/auth";
import { listProducts } from "@/lib/services/product";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Products — Rose Cosmetics POS" };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const products = await listProducts({ query: params.q });
  const canWrite = hasRole(user, CATALOG_WRITE_ROLES);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Catalog"
        title="Products"
        description="Everything the store sells — scanned by barcode at the till."
        actions={
          canWrite ? (
            <a href="/products/new" className="btn-primary">
              Add product
            </a>
          ) : null
        }
      />

      <form className="mb-4 flex gap-2" action="/products" method="get">
        <div className="relative flex-1">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-muted"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <circle
                cx="11"
                cy="11"
                r="7"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="m20 20-3-3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <input
            type="search"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Search by name, brand, SKU, or barcode"
            className="block w-full rounded-lg border border-white/10 bg-surface/60 py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted transition-colors hover:border-white/20 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/30"
          />
        </div>
        <button type="submit" className="btn-secondary">
          Search
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-white/10 bg-card">
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Barcode</th>
              <th className="px-4 py-3 text-right">Sell</th>
              <th className="px-4 py-3 text-right">Reorder</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" aria-label="Actions" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {products.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-ink-muted"
                >
                  No products yet.
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium text-ink">
                    <div>{p.name}</div>
                    {p.brand ? (
                      <div className="text-xs text-ink-muted">{p.brand}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {p.category?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-soft">
                    {p.barcode ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {p.sellPrice.toString()}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                    {p.reorderLevel}
                  </td>
                  <td className="px-4 py-3">
                    {p.isActive ? (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-200">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-ink-muted">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canWrite ? (
                      <a
                        href={`/products/${p.id}/edit`}
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
