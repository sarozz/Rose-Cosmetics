"use client";

export function LabelPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn-primary text-sm"
    >
      Print label
    </button>
  );
}
