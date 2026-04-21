"use client";

import { useFormState } from "react-dom";
import { Field, inputClass } from "@/components/form/field";
import { FormError } from "@/components/form/form-error";
import { SubmitButton } from "@/components/form/submit-button";
import { emptySupplierState, type SupplierFormState } from "./state";

type Defaults = {
  name?: string;
  phone?: string | null;
  email?: string | null;
  defaultTerms?: string | null;
  notes?: string | null;
  isActive?: boolean;
};

export function SupplierForm({
  action,
  defaults,
  submitLabel,
}: {
  action: (
    state: SupplierFormState,
    formData: FormData,
  ) => Promise<SupplierFormState>;
  defaults?: Defaults;
  submitLabel: string;
}) {
  const [state, formAction] = useFormState(action, emptySupplierState);
  const isActive = defaults?.isActive ?? true;

  return (
    <form action={formAction} className="max-w-xl space-y-5">
      <Field
        label="Name"
        htmlFor="name"
        required
        error={state.fieldErrors.name}
      >
        <input
          id="name"
          name="name"
          defaultValue={defaults?.name ?? ""}
          required
          autoFocus
          className={inputClass()}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Phone" htmlFor="phone" error={state.fieldErrors.phone}>
          <input
            id="phone"
            name="phone"
            defaultValue={defaults?.phone ?? ""}
            className={inputClass()}
          />
        </Field>
        <Field label="Email" htmlFor="email" error={state.fieldErrors.email}>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={defaults?.email ?? ""}
            className={inputClass()}
          />
        </Field>
      </div>

      <Field
        label="Default payment terms"
        htmlFor="defaultTerms"
        hint="e.g. Net 30, COD"
        error={state.fieldErrors.defaultTerms}
      >
        <input
          id="defaultTerms"
          name="defaultTerms"
          defaultValue={defaults?.defaultTerms ?? ""}
          className={inputClass()}
        />
      </Field>

      <Field label="Notes" htmlFor="notes" error={state.fieldErrors.notes}>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={defaults?.notes ?? ""}
          className={inputClass()}
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={isActive}
          className="h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
        />
        Active
      </label>

      <FormError message={state.formError} />

      <div className="flex gap-3 pt-2">
        <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
        <a href="/suppliers" className="btn-secondary">
          Cancel
        </a>
      </div>
    </form>
  );
}
