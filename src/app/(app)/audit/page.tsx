import { requireRole, AUDIT_VIEW_ROLES } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import {
  AUDIT_ENTITY_TYPES,
  recentAuditLogs,
} from "@/lib/services/audit";

export const metadata = { title: "Audit log — Rose Cosmetics" };

const PAGE_SIZE = 100;

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    entityType?: string;
    actorUserId?: string;
    page?: string;
  }>;
}) {
  await requireRole(AUDIT_VIEW_ROLES);
  const { entityType, actorUserId, page } = await searchParams;
  const pageNum = Math.max(1, Number(page) || 1);

  const entityTypeFilter = AUDIT_ENTITY_TYPES.includes(
    entityType as (typeof AUDIT_ENTITY_TYPES)[number],
  )
    ? entityType
    : undefined;

  const [actors, logs] = await Promise.all([
    prisma.user.findMany({
      where: { auditLogs: { some: {} } },
      select: { id: true, displayName: true },
      orderBy: { displayName: "asc" },
    }),
    recentAuditLogs({
      entityType: entityTypeFilter,
      actorUserId: actorUserId || undefined,
      limit: PAGE_SIZE,
      offset: (pageNum - 1) * PAGE_SIZE,
    }),
  ]);

  const qs = new URLSearchParams();
  if (entityTypeFilter) qs.set("entityType", entityTypeFilter);
  if (actorUserId) qs.set("actorUserId", actorUserId);
  const baseQs = qs.toString();
  const prevHref =
    pageNum > 1
      ? `/audit?${new URLSearchParams({
          ...(entityTypeFilter ? { entityType: entityTypeFilter } : {}),
          ...(actorUserId ? { actorUserId } : {}),
          page: String(pageNum - 1),
        }).toString()}`
      : null;
  const nextHref =
    logs.length === PAGE_SIZE
      ? `/audit?${new URLSearchParams({
          ...(entityTypeFilter ? { entityType: entityTypeFilter } : {}),
          ...(actorUserId ? { actorUserId } : {}),
          page: String(pageNum + 1),
        }).toString()}`
      : null;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader
        eyebrow="Administration"
        title="Audit log"
        description="Who changed what, when. Every catalog, staff, sale, purchase, and return mutation writes exactly one row here."
      />

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div>
          <label
            htmlFor="entityType"
            className="block text-xs font-medium uppercase tracking-wide text-ink-muted"
          >
            Entity type
          </label>
          <select
            id="entityType"
            name="entityType"
            defaultValue={entityTypeFilter ?? ""}
            className="mt-1 block w-48 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200"
          >
            <option value="">All</option>
            {AUDIT_ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="actorUserId"
            className="block text-xs font-medium uppercase tracking-wide text-ink-muted"
          >
            Actor
          </label>
          <select
            id="actorUserId"
            name="actorUserId"
            defaultValue={actorUserId ?? ""}
            className="mt-1 block w-64 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200"
          >
            <option value="">Anyone</option>
            {actors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.displayName}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-secondary">
          Apply
        </button>
        {baseQs ? (
          <a href="/audit" className="text-sm text-ink-muted hover:underline">
            Clear
          </a>
        ) : null}
      </form>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Diff</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-ink-muted">
                  No audit rows for this filter.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="align-top">
                  <td className="px-4 py-3 font-mono text-xs text-ink-soft">
                    {log.createdAt.toISOString().replace("T", " ").slice(0, 19)}
                  </td>
                  <td className="px-4 py-3 text-ink">
                    {log.actor?.displayName ?? (
                      <span className="text-ink-muted">system</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${actionBadge(log.action)}`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    <span className="font-medium text-ink">
                      {log.entityType}
                    </span>
                    <span className="ml-2 font-mono text-xs text-ink-muted">
                      {log.entityId.slice(0, 10)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {log.beforeJson == null && log.afterJson == null ? (
                      <span className="text-ink-muted">—</span>
                    ) : (
                      <details>
                        <summary className="cursor-pointer text-xs font-medium text-rose-700 hover:underline">
                          show
                        </summary>
                        <div className="mt-2 grid gap-3 sm:grid-cols-2">
                          <JsonBlock label="Before" value={log.beforeJson} />
                          <JsonBlock label="After" value={log.afterJson} />
                        </div>
                      </details>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <nav className="flex items-center justify-between text-sm">
        <span className="text-ink-muted">
          Page {pageNum} · showing {logs.length}{" "}
          {logs.length === 1 ? "row" : "rows"}
        </span>
        <div className="flex gap-2">
          {prevHref ? (
            <a href={prevHref} className="btn-secondary">
              ← Previous
            </a>
          ) : null}
          {nextHref ? (
            <a href={nextHref} className="btn-secondary">
              Next →
            </a>
          ) : null}
        </div>
      </nav>
    </div>
  );
}

function actionBadge(action: string): string {
  switch (action) {
    case "CREATE":
      return "bg-emerald-100 text-emerald-800";
    case "UPDATE":
      return "bg-blue-100 text-blue-800";
    case "DELETE":
    case "DEACTIVATE":
      return "bg-rose-100 text-rose-800";
    case "ACTIVATE":
      return "bg-emerald-100 text-emerald-800";
    default:
      return "bg-gray-100 text-ink";
  }
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-ink-muted">
        {label}
      </p>
      <pre className="mt-1 max-h-60 overflow-auto rounded border border-gray-200 bg-gray-50 p-2 font-mono text-[11px] text-ink-soft">
        {value == null ? "—" : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
