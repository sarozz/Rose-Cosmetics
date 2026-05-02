import type { UserRole } from "@prisma/client";

const ROLE_TONE: Record<UserRole, string> = {
  OWNER: "bg-rose-500/15 text-rose-200 ring-rose-400/30",
  MANAGER: "bg-amber-500/15 text-amber-200 ring-amber-400/30",
  CASHIER: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30",
  INVENTORY: "bg-sky-500/15 text-sky-200 ring-sky-400/30",
};

export function UserMenu({
  displayName,
  role,
}: {
  displayName: string;
  role: UserRole;
}) {
  // Initials from the display name — used as a small avatar pill so the
  // header has visual weight without leaning on a stock silhouette.
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <div className="flex items-center gap-3">
      <div
        className="hidden h-9 w-9 flex-shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-br from-rose-500/40 to-rose-700/40 text-sm font-semibold text-rose-100 ring-1 ring-rose-400/30 sm:flex"
        aria-hidden
      >
        {initials || "•"}
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold leading-tight text-ink">
          {displayName}
        </p>
        <span
          className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${ROLE_TONE[role]}`}
        >
          {role}
        </span>
      </div>
      <form action="/logout" method="post">
        <button
          type="submit"
          aria-label="Sign out"
          title="Sign out"
          className="group inline-flex h-9 items-center gap-2 rounded-full border border-white/10 bg-surface/60 px-3 text-sm font-medium text-ink-soft transition-all hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/50"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
            <path
              d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M10 16 4 12l6-4M4 12h11"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </form>
    </div>
  );
}
