"use client";

import { useState } from "react";

export function CopyTrackingLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="mt-3 space-y-2">
      <div className="overflow-hidden rounded-md border border-white/10 bg-page/40 px-3 py-2 text-xs font-mono text-ink-soft">
        <span className="break-all">{url}</span>
      </div>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          } catch {
            // Some browsers (or insecure contexts) block clipboard. Fall back
            // to highlighting the text and letting the user copy manually.
          }
        }}
        className="btn-secondary text-xs"
      >
        {copied ? "Copied ✓" : "Copy link"}
      </button>
    </div>
  );
}
