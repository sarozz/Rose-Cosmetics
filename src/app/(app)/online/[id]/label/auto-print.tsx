"use client";

import { useEffect } from "react";

/**
 * Trigger the browser's print dialog once the page has rendered so the
 * cashier can hit "Print label" and immediately get the OS print prompt
 * without an extra click.
 */
export function AutoPrint() {
  useEffect(() => {
    // requestAnimationFrame so the layout settles + fonts (Allura) load
    // before the print snapshot is taken.
    const id = window.setTimeout(() => {
      window.print();
    }, 200);
    return () => window.clearTimeout(id);
  }, []);
  return null;
}
