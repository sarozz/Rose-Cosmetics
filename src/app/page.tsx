const phases = [
  { id: 0, name: "Discovery", status: "Done" },
  { id: 1, name: "Foundations", status: "In progress" },
  { id: 2, name: "Catalog + receiving", status: "Planned" },
  { id: 3, name: "POS core", status: "Planned" },
  { id: 4, name: "Returns + reports", status: "Planned" },
  { id: 5, name: "Hardening", status: "Planned" },
  { id: 6, name: "Launch", status: "Planned" },
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <header className="border-b border-gray-200 pb-8">
        <p className="text-sm font-medium uppercase tracking-wider text-rose-600">
          Rose Cosmetics
        </p>
        <h1 className="mt-2 text-4xl font-semibold text-ink">
          POS &amp; Inventory System
        </h1>
        <p className="mt-3 max-w-2xl text-ink-soft">
          Online-only, barcode-driven point-of-sale built on Next.js,
          PostgreSQL, Prisma, and Supabase. This is the Phase&nbsp;1 foundation:
          no business logic is wired up yet.
        </p>
      </header>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-ink">Delivery phases</h2>
        <ul className="mt-4 divide-y divide-gray-200 rounded-md border border-gray-200">
          {phases.map((phase) => (
            <li
              key={phase.id}
              className="flex items-center justify-between px-4 py-3 text-sm"
            >
              <span className="font-medium text-ink">
                Phase {phase.id} — {phase.name}
              </span>
              <span
                className={
                  phase.status === "In progress"
                    ? "rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700"
                    : phase.status === "Done"
                      ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                      : "rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-ink-muted"
                }
              >
                {phase.status}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-dashed border-gray-300 p-5">
          <p className="text-sm font-medium text-rose-600">Coming in Phase 3</p>
          <p className="mt-1 text-lg font-semibold text-ink">POS / Cashier</p>
          <p className="mt-2 text-sm text-ink-muted">
            Barcode-first checkout screen.
          </p>
        </div>
        <div className="rounded-lg border border-dashed border-gray-300 p-5">
          <p className="text-sm font-medium text-rose-600">Coming in Phase 2</p>
          <p className="mt-1 text-lg font-semibold text-ink">
            Purchase / Stock Entry
          </p>
          <p className="mt-2 text-sm text-ink-muted">
            Receive supplier stock via scanner.
          </p>
        </div>
      </section>
    </main>
  );
}
