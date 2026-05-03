"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

/**
 * Full-screen overlay shown while the parent <form> is submitting and kept
 * on screen until the task actually finishes — useful when the action
 * navigates away. `useFormStatus` flips back to false the moment the
 * server returns; if a `redirect()` follows we used to flash the original
 * page for a beat before the new route took over. We add a linger window
 * so the overlay stays visible until either:
 *
 *   - the form's parent component unmounts (navigation completes), or
 *   - `LINGER_MS` elapses after pending goes false (covers an error
 *     return that keeps us on the same page).
 *
 * Two cues to convince the user the wait is intentional:
 *   - A concentric "radar" pulse using the brand rose tone.
 *   - A rotating sequence of progress messages so the screen never feels
 *     stuck. The cycle resets whenever the overlay unmounts.
 */
const LINGER_MS = 1200;

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
  const [visible, setVisible] = useState(false);
  const [idx, setIdx] = useState(0);
  const lingerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Open immediately on pending; on pending->false, hold open for LINGER_MS.
  useEffect(() => {
    if (pending) {
      if (lingerRef.current) {
        clearTimeout(lingerRef.current);
        lingerRef.current = null;
      }
      setVisible(true);
      return;
    }
    if (visible) {
      lingerRef.current = setTimeout(() => {
        setVisible(false);
        lingerRef.current = null;
      }, LINGER_MS);
    }
    return () => {
      if (lingerRef.current) {
        clearTimeout(lingerRef.current);
        lingerRef.current = null;
      }
    };
  }, [pending, visible]);

  useEffect(() => {
    if (!visible) {
      setIdx(0);
      return;
    }
    const t = setInterval(
      () => setIdx((i) => (i + 1) % messages.length),
      rotateMs,
    );
    return () => clearInterval(t);
  }, [visible, messages.length, rotateMs]);

  if (!visible) return null;

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
      <span
        aria-hidden
        className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-400 shadow-[0_0_18px_rgba(233,80,125,0.6)]"
      />
    </div>
  );
}
