"use client";

import Link from "next/link";
import type { Route } from "next";
import { useMemo, useRef, useState, useTransition } from "react";
import { useFormState } from "react-dom";
import { Field, FieldGroup, inputClass } from "@/components/form/field";
import { FormError } from "@/components/form/form-error";
import { SubmitButton } from "@/components/form/submit-button";
import {
  createOnlineOrderAction,
  scanOnlineBarcodeAction,
} from "./actions";
import { emptyOnlineState } from "./state";

type Row = {
  key: number;
  productId: string;
  productName: string;
  brand: string | null;
  qty: string;
  unitPrice: string;
};

const CHANNELS = [
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "OTHER", label: "Other" },
] as const;

export function OnlineOrderForm() {
  const [state, formAction] = useFormState(createOnlineOrderAction, emptyOnlineState);
  const [rows, setRows] = useState<Row[]>([]);
  const [nextKey, setNextKey] = useState(1);
  const [scanInput, setScanInput] = useState("");
  const [scanNotice, setScanNotice] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanning, startScan] = useTransition();
  const scanRef = useRef<HTMLInputElement | null>(null);

  const subtotal = useMemo(
    () =>
      rows.reduce((sum, r) => {
        const qty = Number(r.qty);
        const price = Number(r.unitPrice);
        if (!Number.isFinite(qty) || !Number.isFinite(price)) return sum;
        return sum + qty * price;
      }, 0),
    [rows],
  );

  function addOrIncrement(product: {
    id: string;
    name: string;
    brand: string | null;
    sellPrice: string;
  }) {
    setRows((prev) => {
      const existing = prev.find((r) => r.productId === product.id);
      if (existing) {
        return prev.map((r) =>
          r.productId === product.id
            ? { ...r, qty: String(Number(r.qty || "0") + 1) }
            : r,
        );
      }
      const key = nextKey;
      setNextKey((n) => n + 1);
      return [
        ...prev,
        {
          key,
          productId: product.id,
          productName: product.name,
          brand: product.brand,
          qty: "1",
          unitPrice: product.sellPrice,
        },
      ];
    });
  }

  function updateRow(key: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeRow(key: number) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  function handleScan(e: React.FormEvent) {
    e.preventDefault();
    const raw = scanInput.trim();
    if (!raw) return;
    setScanNotice(null);
    setScanError(null);
    startScan(async () => {
      const result = await scanOnlineBarcodeAction(raw);
      if (!result.ok) {
        setScanError(result.error);
        return;
      }
      addOrIncrement(result.product);
      setScanNotice(
        `Added ${result.product.name}${result.product.brand ? " · " + result.product.brand : ""}`,
      );
      setScanInput("");
      scanRef.current?.focus();
    });
  }

  return (
    <form action={formAction} className="space-y-6">
      <FieldGroup
        title="Customer"
        description="Where the order is going. Phone is required so the courier can call on arrival."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Customer name"
            htmlFor="customerName"
            required
            error={state.fieldErrors.customerName}
          >
            <input
              id="customerName"
              name="customerName"
              required
              autoComplete="off"
              className={inputClass()}
            />
          </Field>
          <Field
            label="Phone"
            htmlFor="customerPhone"
            required
            error={state.fieldErrors.customerPhone}
          >
            <input
              id="customerPhone"
              name="customerPhone"
              type="tel"
              required
              autoComplete="off"
              className={inputClass()}
            />
          </Field>
        </div>
        <Field
          label="Delivery address"
          htmlFor="customerAddress"
          required
          error={state.fieldErrors.customerAddress}
        >
          <textarea
            id="customerAddress"
            name="customerAddress"
            rows={2}
            required
            className={inputClass()}
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Channel" htmlFor="channel">
            <select
              id="channel"
              name="channel"
              defaultValue="INSTAGRAM"
              className={inputClass()}
            >
              {CHANNELS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Discount"
            htmlFor="discount"
            error={state.fieldErrors.discount}
            adornment="Rs"
          >
            <input
              id="discount"
              name="discount"
              type="number"
              step="0.01"
              min="0"
              defaultValue="0"
              className={inputClass()}
            />
          </Field>
        </div>
        <Field label="Note" htmlFor="note" error={state.fieldErrors.note}>
          <textarea
            id="note"
            name="note"
            rows={2}
            placeholder="e.g. ring the bell, leave at door, paid via eSewa…"
            className={inputClass()}
          />
        </Field>
      </FieldGroup>

      <FieldGroup
        title="Cart"
        description="Scan or type a barcode and press Enter. Adjust quantity and price per line."
      >
        <div
          onKeyDown={(e) => {
            // Scanner wedges press Enter after digits — intercept so the parent
            // form doesn't submit.
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
                    handleScan(e);
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
              onClick={handleScan}
              disabled={scanning || !scanInput.trim()}
              className="btn-secondary"
            >
              {scanning ? "Looking up…" : "Add"}
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
              Use the global scanner or type. Each scan adds 1; scan again to bump qty.
            </p>
          )}
        </div>

        {rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-white/10 bg-page/40 px-4 py-6 text-center text-sm text-ink-muted">
            Cart is empty — scan a product to start.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-white/10 bg-card">
            {rows.map((row, index) => (
              <div
                key={row.key}
                className="grid gap-3 border-b border-white/5 px-4 py-3 last:border-b-0 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end"
              >
                <input type="hidden" name={`items.${index}.productId`} value={row.productId} />
                <div>
                  <p className="text-sm font-medium text-ink">{row.productName}</p>
                  {row.brand ? (
                    <p className="text-xs text-ink-muted">{row.brand}</p>
                  ) : null}
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
                    htmlFor={`items-${row.key}-unitPrice`}
                    className="block text-xs font-medium text-ink-soft"
                  >
                    Price
                  </label>
                  <input
                    id={`items-${row.key}-unitPrice`}
                    name={`items.${index}.unitPrice`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.unitPrice}
                    onChange={(e) => updateRow(row.key, { unitPrice: e.target.value })}
                    className={inputClass()}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(row.key)}
                  className="text-sm text-ink-muted hover:text-rose-300"
                  aria-label={`Remove ${row.productName}`}
                >
                  Remove
                </button>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 text-sm">
              <span className="text-ink-muted">Estimated subtotal</span>
              <span className="font-semibold tabular-nums text-ink">
                Rs {subtotal.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </FieldGroup>

      <FormError message={state.formError} />

      <div className="flex gap-3 pt-2">
        <SubmitButton pendingLabel="Confirming…">Confirm order</SubmitButton>
        <Link href={"/online" as Route} className="btn-secondary">
          Cancel
        </Link>
      </div>
    </form>
  );
}
