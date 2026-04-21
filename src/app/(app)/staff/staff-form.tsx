"use client";

import { useFormState } from "react-dom";
import type { UserRole } from "@prisma/client";
import { Field, inputClass } from "@/components/form/field";
import { FormError } from "@/components/form/form-error";
import { SubmitButton } from "@/components/form/submit-button";
import { emptyStaffState, type StaffFormState } from "./state";

export const ALL_ROLES: UserRole[] = ["OWNER", "MANAGER", "CASHIER", "INVENTORY"];

type Defaults = {
  email?: string;
  displayName?: string;
  role?: UserRole;
  isActive?: boolean;
};

/**
 * Shared form for `create` and `update`. The shape is slightly different:
 *   - `create` asks for email + displayName + role (new row is active by default)
 *   - `update` omits email (never change a primary key) and exposes isActive
 *
 * `mode` drives which fields render; the server action validates the
 * appropriate subset.
 */
export function StaffForm({
  action,
  mode,
  defaults,
  submitLabel,
  selfEdit,
}: {
  action: (
    state: StaffFormState,
    formData: FormData,
  ) => Promise<StaffFormState>;
  mode: "create" | "update";
  defaults?: Defaults;
  submitLabel: string;
  selfEdit?: boolean;
}) {
  const [state, formAction] = useFormState(action, emptyStaffState);
  const isActive = defaults?.isActive ?? true;
  const currentRole = defaults?.role ?? "CASHIER";

  return (
    <form action={formAction} className="max-w-xl space-y-5">
      <FormError message={state.formError} />
      {mode === "create" ? (
        <>
          <Field
            label="Email"
            htmlFor="email"
            required
            hint="Used to sign in. Share it with the staff member along with the temporary password."
            error={state.fieldErrors.email}
            adornment="@"
          >
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={defaults?.email ?? ""}
              required
              autoFocus
              className={inputClass()}
            />
          </Field>
          <Field
            label="Temporary password"
            htmlFor="password"
            required
            hint="Minimum 8 characters. Share it with the staff member privately — they should change it later."
            error={state.fieldErrors.password}
          >
            <input
              id="password"
              name="password"
              type="text"
              minLength={8}
              required
              autoComplete="new-password"
              className={inputClass()}
            />
          </Field>
        </>
      ) : (
        <div>
          <p className="text-sm font-medium text-ink">Email</p>
          <p className="mt-1 text-sm text-ink-muted">{defaults?.email}</p>
        </div>
      )}

      <Field
        label="Display name"
        htmlFor="displayName"
        required
        error={state.fieldErrors.displayName}
      >
        <input
          id="displayName"
          name="displayName"
          defaultValue={defaults?.displayName ?? ""}
          required
          autoFocus={mode === "update"}
          className={inputClass()}
        />
      </Field>

      <Field
        label="Role"
        htmlFor="role"
        required
        hint={
          selfEdit
            ? "You cannot change your own role."
            : "OWNER can manage staff. INVENTORY handles receiving. CASHIER rings sales."
        }
        error={state.fieldErrors.role}
      >
        <select
          id="role"
          name="role"
          defaultValue={currentRole}
          required
          disabled={selfEdit}
          className={inputClass()}
        >
          {ALL_ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </Field>

      {mode === "update" ? (
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={isActive}
            disabled={selfEdit}
            className="h-4 w-4 rounded border-white/10 text-rose-400 focus:ring-rose-400 disabled:opacity-50"
          />
          Active{selfEdit ? " (you cannot deactivate yourself)" : ""}
        </label>
      ) : null}

      <div className="flex gap-3 pt-2">
        <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
        <a href="/staff" className="btn-secondary">
          Cancel
        </a>
      </div>
    </form>
  );
}
