"use client";

import { deleteRecipientAction } from "./actions";

/**
 * Client-side wrapper so we can attach the JS `confirm()` onSubmit without
 * making the whole settings page a client component. The form itself still
 * posts to the server action.
 */
export function DeleteRecipientButton({ id }: { id: string }) {
  return (
    <form
      action={deleteRecipientAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            "Remove this recipient? They'll stop receiving alerts.",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="text-ink-muted hover:text-rose-300"
      >
        Remove
      </button>
    </form>
  );
}
