"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Route } from "next";

/**
 * Global barcode-scanner listener for cashiers. Most USB / Bluetooth
 * scanners emit rapid digit characters terminated by Enter — we treat
 * any sequence of digits arriving faster than a human could type as a
 * scan, and route the cashier to /pos with the barcode pre-loaded.
 *
 * Skipped when:
 *   - The user is typing in a form field (we'd otherwise hijack
 *     keystrokes meant for product/receiving forms etc.).
 *   - The cashier is already on /pos (the page's own scan input
 *     auto-focuses and handles things directly).
 *
 * Only mounted for `CASHIER` role per the product brief — owners /
 * managers may be in the middle of admin work and don't want their
 * keyboard taken over.
 */
export function GlobalScanListener({ role }: { role: string }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (role !== "CASHIER") return;

    // Don't fight POS for the keystrokes — its own input is already
    // auto-focused and will receive the scanner output natively.
    if (pathname === "/pos" || pathname?.startsWith("/pos/")) return;

    let buffer = "";
    let lastKeyAt = 0;
    // Scanners typically emit at 5–15ms between chars; humans can't beat 50ms.
    const SCAN_GAP_MS = 50;
    // Shortest barcode we care about (EAN-8). Below this, treat as noise.
    const MIN_LEN = 8;

    function isFormElement(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if (target.isContentEditable) return true;
      return false;
    }

    function onKey(e: KeyboardEvent) {
      // Ignore keys that come with modifier combos (Ctrl/Meta/Alt) — those
      // are app shortcuts, not scanner output.
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // Don't hijack form input.
      if (isFormElement(e.target)) return;

      const now = performance.now();
      const gap = lastKeyAt === 0 ? 0 : now - lastKeyAt;

      if (e.key === "Enter") {
        if (buffer.length >= MIN_LEN) {
          const code = buffer;
          buffer = "";
          lastKeyAt = 0;
          e.preventDefault();
          router.push(
            (`/pos?scan=${encodeURIComponent(code)}` as unknown) as Route,
          );
        } else {
          buffer = "";
          lastKeyAt = 0;
        }
        return;
      }

      // Slow gap → treat as fresh sequence; resets so consecutive scans don't
      // bleed into each other.
      if (gap > SCAN_GAP_MS) buffer = "";

      if (/^[0-9]$/.test(e.key)) {
        buffer += e.key;
        lastKeyAt = now;
      } else if (e.key.length === 1) {
        // A printable non-digit mid-sequence isn't part of a barcode we'd
        // recognise — drop the buffer.
        buffer = "";
        lastKeyAt = 0;
      }
    }

    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [role, pathname, router]);

  return null;
}
