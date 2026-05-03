"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

/**
 * Full-screen overlay shown while the parent <form> is submitting. Reads
 * pending state via useFormStatus, so it must be a *child* of the form
 * (and itself a Client Component).
 *
 * Two cues to convince the user the wait is intentional:
 *   - A concentric "radar" pulse using the brand rose tone.
 *   - A rotating sequence of progress messages so the screen never feels
 *     stuck. The cycle resets whenever the form leaves the pending state.
 */
export function FormPendingOverlay({
  title,
  messages,
  rotateMs = 1800,
}: {
  title: string;
  messages: string[];
  rotateMs?: number;
}) {
  const { pending } = useFormStatus();
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!pending) {
      setIdx(0);
      return;
    }
    const t = setInterval(
      () => setIdx((i) => (i + 1) % messages.length),
      rotateMs,
    );
    return () => clearInterval(t);
  }, [pending, messages.length, rotateMs]);

  if (!pending) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-page/85 backdrop-blur-sm animate-overlay-in"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex w-[18rem] max-w-[90vw] flex-col items-center gap-5 rounded-2xl border border-white/10 bg-card px-8 py-9 shadow-2xl">
        <RoseRadar />
        <div className="text-center">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <p
            key={idx}
            className="mt-1.5 text-sm text-ink-soft animate-message-fade"
          >
            {messages[idx]}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes overlay-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .animate-overlay-in { animation: overlay-in 200ms ease-out both; }

        @keyframes message-fade {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-message-fade { animation: message-fade 320ms ease-out both; }

        @keyframes radar-pulse {
          0%   { transform: scale(0.6); opacity: 0.6; }
          80%  { transform: scale(1.6); opacity: 0; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .animate-radar-pulse { animation: radar-pulse 1.6s cubic-bezier(.4,.0,.6,1) infinite; }
      `}</style>
    </div>
  );
}

function RoseRadar() {
  // Three concentric rings ping outward with staggered delays so the loop
  // reads as a continuous wave rather than three discrete pulses.
  return (
    <div className="relative h-16 w-16">
      <span
        className="absolute inset-0 rounded-full bg-rose-500/40 animate-radar-pulse"
        aria-hidden
      />
      <span
        className="absolute inset-0 rounded-full bg-rose-400/40 animate-radar-pulse"
        style={{ animationDelay: "400ms" }}
        aria-hidden
      />
      <span
        className="absolute inset-0 rounded-full bg-rose-300/40 animate-radar-pulse"
        style={{ animationDelay: "800ms" }}
        aria-hidden
      />
      {/* Solid centre dot — always visible so the user has a fixed anchor. */}
      <span
        aria-hidden
        className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-400 shadow-[0_0_18px_rgba(233,80,125,0.6)]"
      />
    </div>
  );
}
