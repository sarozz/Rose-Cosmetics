import type { ReactNode } from "react";

/**
 * Field wraps a labelled input with optional hint + error text, and optionally
 * an `adornment` rendered flush-left inside the input (e.g. "$", "✉", "#").
 * When `adornment` is set, the direct child input/select automatically gets
 * `pl-9` via a child selector so call sites don't have to opt in.
 */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  adornment,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  adornment?: ReactNode;
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
      {adornment ? (
        <div className="relative mt-1">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-ink-muted"
          >
            {adornment}
          </span>
          <div className="[&>input]:pl-9 [&>select]:pl-9 [&>textarea]:pl-9">
            {children}
          </div>
        </div>
      ) : (
        <div className="mt-1">{children}</div>
      )}
      {hint && !error ? (
        <p className="mt-1.5 text-xs text-ink-muted">{hint}</p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-1.5 text-xs text-rose-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const INPUT_CLASS =
  "block w-full rounded-lg border border-white/10 bg-surface/60 px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted transition-colors hover:border-white/20 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/30 disabled:bg-surface disabled:text-ink-muted";

export function inputClass(extra?: string) {
  return extra ? `${INPUT_CLASS} ${extra}` : INPUT_CLASS;
}

/**
 * Lightweight section heading used between groups of fields inside a form.
 * Keeps long forms (Product, Receiving) visually scannable.
 */
export function FieldGroup({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="space-y-5">
      <legend className="mb-1 flex w-full items-baseline justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-rose-300">
          {title}
        </span>
        {description ? (
          <span className="text-xs text-ink-muted">{description}</span>
        ) : null}
      </legend>
      {children}
    </fieldset>
  );
}
