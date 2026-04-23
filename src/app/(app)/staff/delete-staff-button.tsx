"use client";

import { useState, useTransition } from "react";
import { deleteStaffAction } from "./actions";

/**
 * Owner-side delete for a staff row. Shows the server-returned error inline
 * (e.g. "has activity on record") rather than silently failing — that's the
 * common case since most staff have at least one sale on file.
 */
export function DeleteStaffButton({
  id,
  name,
  disabled,
}: {
  id: string;
  name: string;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (disabled || pending) return;
    if (!window.confirm(`Delete ${name}? This removes their sign-in account.`)) {
      return;
    }
    const data = new FormData();
    data.set("id", id);
    startTransition(async () => {
      setError(null);
      const result = await deleteStaffAction(data);
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
        {pending ? "Deleting…" : "Delete"}
      </button>
      {error ? (
        <span role="alert" className="max-w-[14rem] text-xs text-rose-300">
          {error}
        </span>
      ) : null}
    </span>
  );
}
