"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useFormState } from "react-dom";
import { Field, inputClass } from "@/components/form/field";
import { FormError } from "@/components/form/form-error";
import { SubmitButton } from "@/components/form/submit-button";
import { emptyReceivingState, type ReceivingFormState } from "./state";
import {
  lookupReceivingBarcodeAction,
  type BarcodeLookupResult,
  type ReceivingProductOption,
} from "./barcode-actions";
import { QuickCreateDialog } from "./quick-create-dialog";

type ProductOption = ReceivingProductOption;

type SupplierOption = { id: string; name: string };

type Row = {
  key: number;
  productId: string;
  qty: string;
  costPrice: string;
  sellPrice: string;
};

type DialogState =
  | { open: false }
  | {
      open: true;
      barcode: string;
      source: "open-beauty-facts" | "unknown";
      prefill: { name: string; brand: string; categoryId: string };
      categories: { id: string; name: string }[];
      rowKey: number | null;
    };

export function ReceivingForm({
  action,
  suppliers,
  products: initialProducts,
  canCreateProducts,
}: {
  action: (
    state: ReceivingFormState,
    formData: FormData,
  ) => Promise<ReceivingFormState>;
  suppliers: SupplierOption[];
  products: ProductOption[];
  canCreateProducts: boolean;
}) {
  const [state, formAction] = useFormState(action, emptyReceivingState);
  const [products, setProducts] = useState<ProductOption[]>(initialProducts);
  const [rows, setRows] = useState<Row[]>([
    { key: 1, productId: "", qty: "", costPrice: "", sellPrice: "" },
  ]);
  const [nextKey, setNextKey] = useState(2);
  const [scanInput, setScanInput] = useState("");
  const [scanNotice, setScanNotice] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanning, startScan] = useTransition();
  const [dialog, setDialog] = useState<DialogState>({ open: false });
  const scanRef = useRef<HTMLInputElement | null>(null);

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

  function addBlankRow() {
    const key = nextKey;
    setRows((r) => [
      ...r,
      { key, productId: "", qty: "", costPrice: "", sellPrice: "" },
    ]);
    setNextKey((n) => n + 1);
    return key;
  }

  function removeRow(key: number) {
    setRows((r) => (r.length === 1 ? r : r.filter((row) => row.key !== key)));
  }

  function updateRow(key: number, patch: Partial<Row>) {
    setRows((r) =>
      r.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  function onProductChange(key: number, productId: string) {
    const product = productById.get(productId);
    updateRow(key, {
      productId,
      costPrice: product?.costPrice ?? "",
      sellPrice: product?.sellPrice ?? "",
    });
  }

  /**
   * Add (or overwrite) a line for the given product. If the first row is
   * still empty ("Select…" with no qty), we fill that one; otherwise we
   * push a new row. Returning early from an empty top row avoids the very
   * first scan leaving a ghost blank line at the top.
   */
  function addOrFillRowForProduct(product: ProductOption): number {
    const emptyTop = rows.find(
      (r) => !r.productId && !r.qty && !r.costPrice && !r.sellPrice,
    );
    if (emptyTop) {
      updateRow(emptyTop.key, {
        productId: product.id,
        costPrice: product.costPrice,
        sellPrice: product.sellPrice,
        qty: "1",
      });
      return emptyTop.key;
    }
    const key = nextKey;
    setRows((r) => [
      ...r,
      {
        key,
        productId: product.id,
        qty: "1",
        costPrice: product.costPrice,
        sellPrice: product.sellPrice,
      },
    ]);
    setNextKey((n) => n + 1);
    return key;
  }

  function handleScanSubmit(e: React.FormEvent) {
    e.preventDefault();
    const raw = scanInput.trim();
    if (!raw) return;
    setScanNotice(null);
    setScanError(null);
    startScan(async () => {
      const result: BarcodeLookupResult =
        await lookupReceivingBarcodeAction(raw);
      if (result.kind === "invalid") {
        setScanError("Enter an 8–14 digit barcode.");
        return;
      }
      if (result.kind === "existing") {
        addOrFillRowForProduct(result.product);
        setScanNotice(
          `Added ${result.product.name}${result.product.brand ? " · " + result.product.brand : ""}`,
        );
        setScanInput("");
        scanRef.current?.focus();
        return;
      }
      // prefill — either OBF had a hit or the code is unknown
      if (!canCreateProducts) {
        setScanError(
          "This barcode isn't in the catalog yet. Ask a manager to add it.",
        );
        return;
      }
      setDialog({
        open: true,
        barcode: result.barcode,
        source: result.source,
        prefill: result.prefill,
        categories: result.categories,
        rowKey: null,
      });
      setScanInput("");
    });
  }

  function handleCreated(product: ProductOption) {
    setProducts((p) => [...p, product].sort((a, b) => a.name.localeCompare(b.name)));
    addOrFillRowForProduct(product);
    setDialog({ open: false });
    setScanNotice(
      `Added ${product.name}${product.brand ? " · " + product.brand : ""}`,
    );
    scanRef.current?.focus();
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

      <div className="rounded-lg border border-white/10 bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">Line items</h2>
          <button
            type="button"
            onClick={() => addBlankRow()}
            className="text-sm font-medium text-rose-300 hover:underline"
          >
            + Add line
          </button>
        </div>
        <div
          className="border-b border-white/10 px-4 py-3"
          onKeyDown={(e) => {
            // Scanner keyboard wedges send the digits then press Enter. We
            // intercept here so the Enter doesn't bubble up and submit the
            // whole receiving form.
            if (e.key === "Enter") e.stopPropagation();
          }}
        >
          <label
            htmlFor="scanBarcode"
            className="block text-xs font-medium text-ink-soft"
          >
            Scan barcode
          </label>
          <div className="mt-1 flex gap-2">
            <div className="relative flex-1">
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-ink-muted"
              >
                #
              </span>
              <input
                id="scanBarcode"
                ref={scanRef}
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleScanSubmit(e);
                  }
                }}
                placeholder="Scan or type, then press Enter"
                inputMode="numeric"
                autoComplete="off"
                className={inputClass("pl-9")}
              />
            </div>
            <button
              type="button"
              onClick={handleScanSubmit}
              disabled={scanning || scanInput.trim() === ""}
              className="btn-secondary"
            >
              {scanning ? "Looking up…" : "Look up"}
            </button>
          </div>
          {scanError ? (
            <p role="alert" className="mt-2 text-xs text-rose-300">
              {scanError}
            </p>
          ) : scanNotice ? (
            <p className="mt-2 text-xs text-emerald-300">{scanNotice}</p>
          ) : (
            <p className="mt-2 text-xs text-ink-muted">
              Existing products are added to the list. Unknown codes open a
              quick-create form pre-filled from Open Beauty Facts.
            </p>
          )}
        </div>
        <div className="divide-y divide-white/5">
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
                className="text-sm text-ink-muted hover:text-rose-300 disabled:opacity-30"
                aria-label="Remove line"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 text-sm">
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

      {dialog.open ? (
        <QuickCreateDialog
          open
          barcode={dialog.barcode}
          source={dialog.source}
          prefill={dialog.prefill}
          categories={dialog.categories}
          onClose={() => setDialog({ open: false })}
          onCreated={handleCreated}
        />
      ) : null}
    </form>
  );
}
