"use client";

import { useFormState } from "react-dom";
import { Field, inputClass } from "@/components/form/field";
import { FormError } from "@/components/form/form-error";
import { SubmitButton } from "@/components/form/submit-button";
import { emptyCategoryState, type CategoryFormState } from "./state";

type Option = { id: string; name: string };

type Defaults = {
  name?: string;
  parentId?: string | null;
  isActive?: boolean;
};

export function CategoryForm({
  action,
  parents,
  defaults,
  submitLabel,
}: {
  action: (
    state: CategoryFormState,
    formData: FormData,
  ) => Promise<CategoryFormState>;
  parents: Option[];
  defaults?: Defaults;
  submitLabel: string;
}) {
  const [state, formAction] = useFormState(action, emptyCategoryState);
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

      <Field
        label="Parent category"
        htmlFor="parentId"
        hint="Optional. Use to group related categories."
        error={state.fieldErrors.parentId}
      >
        <select
          id="parentId"
          name="parentId"
          defaultValue={defaults?.parentId ?? ""}
          className={inputClass()}
        >
          <option value="">None</option>
          {parents.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
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
        <a href="/categories" className="btn-secondary">
          Cancel
        </a>
      </div>
    </form>
  );
}
