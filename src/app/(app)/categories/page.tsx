import { CATALOG_WRITE_ROLES, hasRole, requireUser } from "@/lib/auth";
import { listCategories } from "@/lib/services/category";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Categories — Rose Cosmetics POS" };

export default async function CategoriesPage() {
  const user = await requireUser();
  const categories = await listCategories();
  const canWrite = hasRole(user, CATALOG_WRITE_ROLES);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Catalog"
        title="Categories"
        description="Group products for faster lookup and reporting."
        actions={
          canWrite ? (
            <a href="/categories/new" className="btn-primary">
              Add category
            </a>
          ) : null
        }
      />

      <div className="overflow-hidden rounded-lg border border-white/10 bg-card">
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Parent</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" aria-label="Actions" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {categories.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-10 text-center text-ink-muted"
                >
                  No categories yet.
                </td>
              </tr>
            ) : (
              categories.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-medium text-ink">{c.name}</td>
                  <td className="px-4 py-3 text-ink-soft">
                    {c.parent?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {c.isActive ? (
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
                        href={`/categories/${c.id}/edit`}
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
