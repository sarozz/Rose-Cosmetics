import { requireRole, STAFF_WRITE_ROLES } from "@/lib/auth";
import { listStaff } from "@/lib/services/user";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Staff — Rose Cosmetics" };

export default async function StaffPage() {
  await requireRole(STAFF_WRITE_ROLES);
  const staff = await listStaff();

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Administration"
        title="Staff"
        description="OWNERs provision and manage everyone else. A new row is inactive until its email signs in via Supabase Auth the first time."
        actions={
          <a href="/staff/new" className="btn-primary">
            Add staff member
          </a>
        }
      />

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Signed in?</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {staff.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-ink-muted">
                  No staff yet.
                </td>
              </tr>
            ) : (
              staff.map((u) => (
                <tr key={u.id} className={u.isActive ? "" : "opacity-60"}>
                  <td className="px-4 py-3 font-medium text-ink">
                    {u.displayName}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-ink">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.isActive ? (
                      <span className="text-emerald-700">Active</span>
                    ) : (
                      <span className="text-ink-muted">Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {u.authId ? "Yes" : "Pending first sign-in"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <a
                      href={`/staff/${u.id}/edit`}
                      className="text-sm font-medium text-rose-700 hover:underline"
                    >
                      Edit
                    </a>
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
