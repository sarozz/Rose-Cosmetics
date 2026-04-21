"use client";

import { useFormState } from "react-dom";
import { Field, inputClass } from "@/components/form/field";
import { FormError } from "@/components/form/form-error";
import { SubmitButton } from "@/components/form/submit-button";
import { emptyProductState, type ProductFormState } from "./state";

type Option = { id: string; name: string };

type Defaults = {
  name?: string;
  brand?: string | null;
  barcode?: string | null;
  sku?: string | null;
  categoryId?: string | null;
  costPrice?: unknown;
  sellPrice?: unknown;
  reorderLevel?: number;
  isActive?: boolean;
};

export function ProductForm({
  action,
  categories,
  defaults,
  submitLabel,
}: {
  action: (
    state: ProductFormState,
    formData: FormData,
  ) => Promise<ProductFormState>;
  categories: Option[];
  defaults?: Defaults;
  submitLabel: string;
}) {
  const [state, formAction] = useFormState(action, emptyProductState);
  const isActive = defaults?.isActive ?? true;

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
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
        <Field label="Brand" htmlFor="brand" error={state.fieldErrors.brand}>
          <input
            id="brand"
            name="brand"
            defaultValue={defaults?.brand ?? ""}
            className={inputClass()}
          />
        </Field>
        <Field
          label="Category"
          htmlFor="categoryId"
          error={state.fieldErrors.categoryId}
        >
          <select
            id="categoryId"
            name="categoryId"
            defaultValue={defaults?.categoryId ?? ""}
            className={inputClass()}
          >
            <option value="">Uncategorised</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Barcode"
          htmlFor="barcode"
          hint="12 or 13 digit UPC / EAN"
          error={state.fieldErrors.barcode}
        >
          <input
            id="barcode"
            name="barcode"
            inputMode="numeric"
            pattern="\d*"
            defaultValue={defaults?.barcode ?? ""}
            className={inputClass()}
          />
        </Field>
        <Field label="SKU" htmlFor="sku" error={state.fieldErrors.sku}>
          <input
            id="sku"
            name="sku"
            defaultValue={defaults?.sku ?? ""}
            className={inputClass()}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field
          label="Cost price"
          htmlFor="costPrice"
          required
          error={state.fieldErrors.costPrice}
        >
          <input
            id="costPrice"
            name="costPrice"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={numberDefault(defaults?.costPrice)}
            className={inputClass()}
          />
        </Field>
        <Field
          label="Sell price"
          htmlFor="sellPrice"
          required
          error={state.fieldErrors.sellPrice}
        >
          <input
            id="sellPrice"
            name="sellPrice"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={numberDefault(defaults?.sellPrice)}
            className={inputClass()}
          />
        </Field>
        <Field
          label="Reorder level"
          htmlFor="reorderLevel"
          hint="Alert threshold"
          error={state.fieldErrors.reorderLevel}
        >
          <input
            id="reorderLevel"
            name="reorderLevel"
            type="number"
            step="1"
            min="0"
            defaultValue={defaults?.reorderLevel ?? 0}
            className={inputClass()}
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={isActive}
          className="h-4 w-4 rounded border-white/10 text-rose-400 focus:ring-rose-400"
        />
        Active
      </label>

      <FormError message={state.formError} />

      <div className="flex gap-3 pt-2">
        <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
        <a href="/products" className="btn-secondary">
          Cancel
        </a>
      </div>
    </form>
  );
}

// Prisma Decimal values arrive as objects with a toString method. Coerce to a
// plain string for the input so the browser renders the numeric value.
function numberDefault(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "toString" in value) {
    return String(value);
  }
  return "";
}
