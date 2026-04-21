"use client";

import { useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { Field, inputClass } from "@/components/form/field";
import { FormError } from "@/components/form/form-error";
import { SubmitButton } from "@/components/form/submit-button";
import { emptyReceivingState, type ReceivingFormState } from "./state";

type ProductOption = {
  id: string;
  name: string;
  brand: string | null;
  costPrice: string;
  sellPrice: string;
};

type SupplierOption = { id: string; name: string };

type Row = {
  key: number;
  productId: string;
  qty: string;
  costPrice: string;
  sellPrice: string;
};

export function ReceivingForm({
  action,
  suppliers,
  products,
}: {
  action: (
    state: ReceivingFormState,
    formData: FormData,
  ) => Promise<ReceivingFormState>;
  suppliers: SupplierOption[];
  products: ProductOption[];
}) {
  const [state, formAction] = useFormState(action, emptyReceivingState);
  const [rows, setRows] = useState<Row[]>([
    { key: 1, productId: "", qty: "", costPrice: "", sellPrice: "" },
  ]);
  const [nextKey, setNextKey] = useState(2);

  const productById = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  );

  const total = rows.reduce((sum, row) => {
    const qty = Number(row.qty);
    const cost = Number(row.costPrice);
    if (!Number.isFinite(qty) || !Number.isFinite(cost)) return sum;
    return sum + qty * cost;
  }, 0);

  function addRow() {
    setRows((r) => [
      ...r,
      { key: nextKey, productId: "", qty: "", costPrice: "", sellPrice: "" },
    ]);
    setNextKey((n) => n + 1);
  }

  function removeRow(key: number) {
    setRows((r) => (r.length === 1 ? r : r.filter((row) => row.key !== key)));
  }

  function updateRow(key: number, patch: Partial<Row>) {
    setRows((r) => r.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function onProductChange(key: number, productId: string) {
    const product = productById.get(productId);
    updateRow(key, {
      productId,
      costPrice: product?.costPrice ?? "",
      sellPrice: product?.sellPrice ?? "",
    });
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Supplier"
          htmlFor="supplierId"
          required
          error={state.fieldErrors.supplierId}
        >
          <select
            id="supplierId"
            name="supplierId"
            required
            className={inputClass()}
          >
            <option value="">Select a supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Receipt date"
          htmlFor="purchaseDate"
          error={state.fieldErrors.purchaseDate}
        >
          <input
            id="purchaseDate"
            name="purchaseDate"
            type="date"
            defaultValue={today}
            className={inputClass()}
          />
        </Field>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">Line items</h2>
          <button
            type="button"
            onClick={addRow}
            className="text-sm font-medium text-rose-700 hover:underline"
          >
            + Add line
          </button>
        </div>
        <div className="divide-y divide-gray-100">
          {rows.map((row, index) => (
            <div
              key={row.key}
              className="grid gap-3 px-4 py-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] sm:items-end"
            >
              <div>
                <label
                  htmlFor={`items-${row.key}-productId`}
                  className="block text-xs font-medium text-ink-soft"
                >
                  Product
                </label>
                <select
                  id={`items-${row.key}-productId`}
                  name={`items.${index}.productId`}
                  value={row.productId}
                  onChange={(e) => onProductChange(row.key, e.target.value)}
                  className={inputClass()}
                >
                  <option value="">Select…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.brand ? ` · ${p.brand}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor={`items-${row.key}-qty`}
                  className="block text-xs font-medium text-ink-soft"
                >
                  Qty
                </label>
                <input
                  id={`items-${row.key}-qty`}
                  name={`items.${index}.qty`}
                  type="number"
                  min="1"
                  step="1"
                  value={row.qty}
                  onChange={(e) => updateRow(row.key, { qty: e.target.value })}
                  className={inputClass()}
                />
              </div>
              <div>
                <label
                  htmlFor={`items-${row.key}-costPrice`}
                  className="block text-xs font-medium text-ink-soft"
                >
                  Cost
                </label>
                <input
                  id={`items-${row.key}-costPrice`}
                  name={`items.${index}.costPrice`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.costPrice}
                  onChange={(e) =>
                    updateRow(row.key, { costPrice: e.target.value })
                  }
                  className={inputClass()}
                />
              </div>
              <div>
                <label
                  htmlFor={`items-${row.key}-sellPrice`}
                  className="block text-xs font-medium text-ink-soft"
                >
                  Sell
                </label>
                <input
                  id={`items-${row.key}-sellPrice`}
                  name={`items.${index}.sellPrice`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.sellPrice}
                  onChange={(e) =>
                    updateRow(row.key, { sellPrice: e.target.value })
                  }
                  className={inputClass()}
                />
              </div>
              <button
                type="button"
                onClick={() => removeRow(row.key)}
                disabled={rows.length === 1}
                className="text-sm text-ink-muted hover:text-rose-700 disabled:opacity-30"
                aria-label="Remove line"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-sm">
          <span className="text-ink-muted">Estimated total</span>
          <span className="font-semibold tabular-nums text-ink">
            {total.toFixed(2)}
          </span>
        </div>
      </div>

      <Field label="Notes" htmlFor="notes" error={state.fieldErrors.notes}>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          className={inputClass()}
        />
      </Field>

      <FormError message={state.formError} />

      <div className="flex gap-3 pt-2">
        <SubmitButton pendingLabel="Recording…">Record receipt</SubmitButton>
        <a href="/receiving" className="btn-secondary">
          Cancel
        </a>
      </div>
    </form>
  );
}
