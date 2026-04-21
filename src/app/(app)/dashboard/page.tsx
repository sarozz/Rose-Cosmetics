import { requireUser } from "@/lib/auth";

export const metadata = { title: "Dashboard — Rose Cosmetics POS" };

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8">
        <p className="text-sm font-medium uppercase tracking-wider text-rose-600">
          Dashboard
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">
          Welcome, {user.displayName}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          You&rsquo;re signed in as {user.role}. Phase 1 is live — catalog and
          receiving screens unlock in the next release.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="Today&rsquo;s sales" body="POS ships in Phase 3." />
        <Card title="Low-stock alerts" body="Reorder view ships in Phase 4." />
        <Card title="Recent purchases" body="Receiving ships in Phase 2." />
      </section>
    </div>
  );
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
        {title}
      </p>
      <p className="mt-2 text-sm text-ink">{body}</p>
    </div>
  );
}
