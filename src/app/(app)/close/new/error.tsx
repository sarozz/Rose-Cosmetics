"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Error boundary for /close/new. Catches anything that escapes
 * `previewClose()` or the form render, logs the message to the server
 * via Next's built-in error pipeline, and shows the cashier a specific
 * message instead of a blank page. A visible `digest` is Next's
 * server-side error fingerprint — cross-ref it in Vercel logs.
 */
export default function NewCloseError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("Day close · new close page failed", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl space-y-4 py-8">
      <h1 className="text-xl font-semibold text-ink">Couldn&rsquo;t load the close form</h1>
      <p className="text-sm text-ink-muted">
        Something went wrong while preparing the period totals.
      </p>
      <pre className="overflow-x-auto rounded-lg border border-white/10 bg-surface/60 p-3 text-xs text-rose-300">
        {error.message}
        {error.digest ? `\nDigest: ${error.digest}` : null}
      </pre>
      <div className="flex gap-3">
        <button type="button" onClick={reset} className="btn-primary">
          Try again
        </button>
        <Link href="/close" className="btn-secondary">
          Back to Day close
        </Link>
      </div>
    </div>
  );
}
