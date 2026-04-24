"use client";

/**
 * Small client wrapper so we can window.open with specific features
 * (popup-style, no menu bar) without promoting a full Client Component
 * page. `window.open(..., "_blank", "popup")` gives the cashier a
 * stripped browser chrome they can drag to the external monitor.
 */
export function OpenCustomerDisplay() {
  function handleClick() {
    window.open(
      "/display",
      "rose-customer-display",
      "popup=yes,noopener=no,noreferrer=no,width=1280,height=800",
    );
  }
  return (
    <button type="button" onClick={handleClick} className="btn-secondary">
      Open customer display
    </button>
  );
}
