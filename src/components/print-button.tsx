"use client";

/**
 * Small button that fires window.print(). The sidebar and app header carry
 * `no-print` so the printed page renders with just the active content
 * surface — see globals.css for the @media print rules.
 */
export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-surface/60 px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-white/20 hover:text-ink"
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
        <path
          d="M6 9V4h12v5M6 18h12v3H6zM6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label}
    </button>
  );
}
