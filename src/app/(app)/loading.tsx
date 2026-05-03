/**
 * Lightweight app-level loading skeleton. Next renders this whenever a
 * route inside (app) is in transit — so the user sees structure
 * immediately on click instead of staring at the previous page until
 * the new one's first paint lands.
 */
export default function AppLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="space-y-3">
        <div className="h-3 w-24 animate-pulse rounded bg-white/5" />
        <div className="h-7 w-64 animate-pulse rounded bg-white/10" />
        <div className="h-3 w-96 max-w-full animate-pulse rounded bg-white/5" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-white/10 bg-card p-5 shadow-sm"
          >
            <div className="h-3 w-24 animate-pulse rounded bg-white/5" />
            <div className="mt-3 h-7 w-32 animate-pulse rounded bg-white/10" />
            <div className="mt-2 h-3 w-40 animate-pulse rounded bg-white/5" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-white/10 bg-card shadow-sm">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-white/5 p-4 last:border-b-0"
          >
            <div className="h-3 flex-1 animate-pulse rounded bg-white/5" />
            <div className="h-3 w-20 animate-pulse rounded bg-white/5" />
            <div className="h-3 w-16 animate-pulse rounded bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}
