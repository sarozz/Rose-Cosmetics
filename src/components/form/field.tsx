import type { ReactNode } from "react";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-ink"
      >
        {label}
        {required ? <span className="ml-1 text-rose-400">*</span> : null}
      </label>
      <div className="mt-1">{children}</div>
      {hint && !error ? (
        <p className="mt-1 text-xs text-ink-muted">{hint}</p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-1 text-xs text-rose-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const INPUT_CLASS =
  "block w-full rounded-md border border-white/10 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/30 disabled:bg-surface disabled:text-ink-muted";

export function inputClass(extra?: string) {
  return extra ? `${INPUT_CLASS} ${extra}` : INPUT_CLASS;
}
