"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { useFormState } from "react-dom";
import { Field, FieldGroup, inputClass } from "@/components/form/field";
import { FormError } from "@/components/form/form-error";
import { SubmitButton } from "@/components/form/submit-button";
import { isValidBarcodeFormat } from "@/lib/validation/barcode";
import { lookupExternalProductAction } from "./actions";
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
  extraBarcodes?: { code: string; label: string | null }[];
};

type ExtraRow = { key: number; code: string; label: string };

type LookupState =
  | { kind: "idle" }
  | { kind: "loading" }
  | {
      kind: "found";
      hint: { categoryHint: string | null; imageUrl: string | null };
    }
  | { kind: "error"; message: string };

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

  // Auto-fill targets are controlled so the Lookup button can populate them
  // without fighting React over uncontrolled state.
  const [name, setName] = useState(defaults?.name ?? "");
  const [brand, setBrand] = useState(defaults?.brand ?? "");
  const [barcode, setBarcode] = useState(defaults?.barcode ?? "");
  const [extras, setExtras] = useState<ExtraRow[]>(() =>
    (defaults?.extraBarcodes ?? []).map((b, i) => ({
      key: i + 1,
      code: b.code,
      label: b.label ?? "",
    })),
  );
  const [extraKey, setExtraKey] = useState(
    (defaults?.extraBarcodes ?? []).length + 1,
  );
  const [lookup, setLookup] = useState<LookupState>({ kind: "idle" });
  const [pending, startLookup] = useTransition();

  const [scanInput, setScanInput] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanNotice, setScanNotice] = useState<string | null>(null);
  const scanRef = useRef<HTMLInputElement | null>(null);

  function addExtra() {
    setExtras((prev) => [...prev, { key: extraKey, code: "", label: "" }]);
    setExtraKey((k) => k + 1);
  }
  function updateExtra(key: number, patch: Partial<ExtraRow>) {
    setExtras((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function removeExtra(key: number) {
    setExtras((prev) => prev.filter((r) => r.key !== key));
  }

  function handleScanAdd() {
    const raw = scanInput.trim();
    if (!raw) return;
    if (!isValidBarcodeFormat(raw)) {
      setScanError("Enter 8 to 14 digits.");
      return;
    }
    if (raw === barcode.trim()) {
      setScanError("This code is already the primary barcode.");
      return;
    }
    if (extras.some((r) => r.code.trim() === raw)) {
      setScanError("That code is already in the list.");
      return;
    }
    setExtras((prev) => [...prev, { key: extraKey, code: raw, label: "" }]);
    setExtraKey((k) => k + 1);
    setScanInput("");
    setScanError(null);
    setScanNotice(`Added ${raw} — type a flavour name on the new row.`);
    scanRef.current?.focus();
  }

  function runLookup() {
    const code = barcode.trim();
    if (!code) {
      setLookup({ kind: "error", message: "Enter a barcode first." });
      return;
    }
    setLookup({ kind: "loading" });
    startLookup(async () => {
      const result = await lookupExternalProductAction(code);
      if (!result.ok) {
        const message =
          result.reason === "invalid-barcode"
            ? "Barcode must be 8–14 digits."
            : result.reason === "not-found"
              ? "Not found in Open Beauty Facts. Fill manually."
              : "Couldn't reach Open Beauty Facts. Try again.";
        setLookup({ kind: "error", message });
        return;
      }
      // Only overwrite a field when it's empty — don't clobber edits the
      // cashier already made.
      if (result.product.name && !name.trim()) setName(result.product.name);
      if (result.product.brand && !brand.trim()) setBrand(result.product.brand);
      setLookup({
        kind: "found",
        hint: {
          categoryHint: result.product.categoryHint,
          imageUrl: result.product.imageUrl,
        },
      });
    });
  }

  return (
    <form action={formAction} className="max-w-2xl space-y-8">
      <FormError message={state.formError} />

      <FieldGroup title="Identity">
        <Field
          label="Name"
          htmlFor="name"
          required
          error={state.fieldErrors.name}
        >
          <input
            id="name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
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
            hint="8 to 14 digits (scanner or manual)"
            error={state.fieldErrors.barcode}
            adornment="#"
          >
            <input
              id="barcode"
              name="barcode"
              inputMode="numeric"
              pattern="\d*"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
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

        <LookupPanel
          state={lookup}
          pending={pending}
          onLookup={runLookup}
        />
      </FieldGroup>

      <FieldGroup
        title="Additional barcodes"
        description="Same product, same price, same stock — just different flavour. Each flavour gets its own barcode; any of them resolve to this product when scanned."
      >
        {state.fieldErrors.extraBarcodes ? (
          <p role="alert" className="text-xs text-rose-300">
            {state.fieldErrors.extraBarcodes}
          </p>
        ) : null}

        {/* Scan-to-add: a USB barcode scanner emits the digits then presses
            Enter. We intercept Enter so the whole form doesn't submit, then
            push the scanned code as a new row. The label is left blank so
            the operator can type a flavour name immediately after. */}
        <div
          onKeyDown={(e) => {
            // Defensive: even if the input below loses focus mid-burst, the
            // Enter shouldn't bubble out of this group and submit the form.
            if (e.key === "Enter") e.stopPropagation();
          }}
        >
          <label
            htmlFor="extra-scan"
            className="block text-xs font-medium text-ink-soft"
          >
            Scan to add
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
                id="extra-scan"
                ref={scanRef}
                value={scanInput}
                onChange={(e) => {
                  setScanInput(e.target.value);
                  setScanError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleScanAdd();
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
              onClick={handleScanAdd}
              disabled={scanInput.trim() === ""}
              className="btn-secondary"
            >
              Add
            </button>
          </div>
          {scanError ? (
            <p role="alert" className="mt-1 text-xs text-rose-300">
              {scanError}
            </p>
          ) : scanNotice ? (
            <p className="mt-1 text-xs text-emerald-300">{scanNotice}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          {extras.length === 0 ? (
            <p className="text-xs text-ink-muted">
              No alternate barcodes. Most products don&apos;t need any — only
              add when the same lipstick comes in multiple flavours each
              boxed with its own code.
            </p>
          ) : (
            extras.map((row, index) => (
              <div
                key={row.key}
                className="grid gap-2 sm:grid-cols-[2fr_3fr_auto] sm:items-center"
              >
                <input
                  type="text"
                  name={`extraBarcodes.${index}.label`}
                  value={row.label}
                  onChange={(e) => updateExtra(row.key, { label: e.target.value })}
                  placeholder="Flavour / variant"
                  className={inputClass()}
                />
                <input
                  type="text"
                  name={`extraBarcodes.${index}.code`}
                  value={row.code}
                  onChange={(e) => updateExtra(row.key, { code: e.target.value })}
                  inputMode="numeric"
                  pattern="\d*"
                  placeholder="Barcode (8–14 digits)"
                  className={inputClass()}
                />
                <button
                  type="button"
                  onClick={() => removeExtra(row.key)}
                  className="text-sm text-ink-muted hover:text-rose-300"
                  aria-label="Remove this barcode"
                >
                  Remove
                </button>
              </div>
            ))
          )}
          <button
            type="button"
            onClick={addExtra}
            className="text-sm font-medium text-rose-300 hover:underline"
          >
            + Add another barcode
          </button>
        </div>
      </FieldGroup>

      <FieldGroup title="Pricing" description="All amounts in shop currency">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Cost price"
            htmlFor="costPrice"
            hint="Optional — fills in on first receipt"
            error={state.fieldErrors.costPrice}
            adornment="Rs"
          >
            <input
              id="costPrice"
              name="costPrice"
              type="number"
              step="0.01"
              min="0"
              defaultValue={numberDefault(defaults?.costPrice)}
              className={inputClass()}
            />
          </Field>
          <Field
            label="Sell price"
            htmlFor="sellPrice"
            required
            error={state.fieldErrors.sellPrice}
            adornment="Rs"
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
        </div>
      </FieldGroup>

      <FieldGroup title="Inventory">
        <Field
          label="Reorder level"
          htmlFor="reorderLevel"
          hint="Alert threshold — 0 means not tracked"
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

        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={isActive}
            className="h-4 w-4 rounded border-white/10 text-rose-400 focus:ring-rose-400"
          />
          Active
        </label>
      </FieldGroup>

      <div className="flex gap-3 pt-2">
        <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
        <Link href="/products" className="btn-secondary">
          Cancel
        </Link>
      </div>
    </form>
  );
}

function LookupPanel({
  state,
  pending,
  onLookup,
}: {
  state: LookupState;
  pending: boolean;
  onLookup: () => void;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-surface/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-rose-300">
            Auto-fill from barcode
          </div>
          <p className="mt-0.5 text-xs text-ink-muted">
            Looks the barcode up on Open Beauty Facts and fills empty fields.
          </p>
        </div>
        <button
          type="button"
          onClick={onLookup}
          disabled={pending}
          className="btn-secondary text-sm disabled:opacity-50"
        >
          {pending || state.kind === "loading" ? "Looking up…" : "Look up"}
        </button>
      </div>

      {state.kind === "found" ? (
        <div className="mt-3 flex items-start gap-3 rounded-md bg-emerald-500/10 p-3 text-xs text-emerald-200">
          {state.hint.imageUrl ? (
            <Image
              src={state.hint.imageUrl}
              alt=""
              width={48}
              height={48}
              unoptimized
              className="h-12 w-12 flex-shrink-0 rounded object-cover"
            />
          ) : null}
          <div>
            <div className="font-medium">Match found.</div>
            <div className="mt-0.5 text-emerald-200/80">
              Name and brand pre-filled (when empty).
              {state.hint.categoryHint
                ? ` Category hint: ${state.hint.categoryHint}.`
                : ""}{" "}
              Source: openbeautyfacts.org.
            </div>
          </div>
        </div>
      ) : null}

      {state.kind === "error" ? (
        <p
          role="alert"
          className="mt-3 rounded-md bg-rose-500/10 px-3 py-2 text-xs text-rose-200"
        >
          {state.message}
        </p>
      ) : null}
    </div>
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
