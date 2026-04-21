"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn-secondary no-print"
    >
      Print receipt
    </button>
  );
}
