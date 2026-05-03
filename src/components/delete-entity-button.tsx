"use client";

import { useState, useTransition } from "react";

export type DeleteEntityResult = { ok: true } | { ok: false; message: string };

/**
 * Reusable destructive button for the catalog list pages (products,
 * categories, suppliers, purchases). Pops a JS confirm with the entity's
 * name, then calls the supplied server action with the id and surfaces
 * any "has dependents" error inline.
 *
 * Server-side guards (FK checks, refusal when activity is on file) live
 * in each entity's service. The disabled flag is just a UX hint — the
 * server is the real authority.
 */
export function DeleteEntityButton({
  id,
  name,
  action,
  disabled,
  label = "Delete",
  confirmLabel,
}: {
  id: string;
  name: string;
  action: (formData: FormData) => Promise<DeleteEntityResult>;
  disabled?: boolean;
  label?: string;
  confirmLabel?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (disabled || pending) return;
    if (!window.confirm(confirmLabel ?? `Delete ${name}?`)) return;
    const data = new FormData();
    data.set("id", id);
    startTransition(async () => {
      setError(null);
      const result = await action(data);
      if (!result.ok) setError(result.message);
    });
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || pending}
        className="text-sm font-medium text-ink-muted transition-colors hover:text-rose-300 disabled:opacity-40 disabled:hover:text-ink-muted"
      >
        {pending ? "Deleting…" : label}
      </button>
      {error ? (
        <span role="alert" className="max-w-[16rem] text-xs text-rose-300">
          {error}
        </span>
      ) : null}
    </span>
  );
}
