"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { Field, inputClass } from "@/components/form/field";
import { FormError } from "@/components/form/form-error";
import { SubmitButton } from "@/components/form/submit-button";
import { checkoutAction, scanBarcodeAction } from "./actions";
import { emptyCheckoutState } from "./state";

type CartLine = {
  productId: string;
  name: string;
  brand: string | null;
  code: string;
  unitPrice: string;
  qty: number;
  discount: string;
  currentStock: number;
};

export function PosClient() {
  const router = useRouter();
  const [state, formAction] = useFormState(checkoutAction, emptyCheckoutState);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [scanInput, setScanInput] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanPending, startScan] = useTransition();
  const [saleDiscount, setSaleDiscount] = useState("0");
  const [cashTendered, setCashTendered] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "DIGITAL">("CASH");
  const [idempotencyKey] = useState(() => cryptoRandomKey());
  const scanRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scanRef.current?.focus();
  }, []);

  useEffect(() => {
    if (state.saleRef) {
      router.push(`/pos/thanks/${state.saleRef}`);
    }
  }, [state.saleRef, router]);

  const subtotal = useMemo(
    () =>
      lines.reduce((sum, line) => {
        const lineTotal =
          Number(line.unitPrice) * line.qty - Number(line.discount || 0);
        return sum + (Number.isFinite(lineTotal) ? lineTotal : 0);
      }, 0),
    [lines],
  );
  const discountNum = Number(saleDiscount || 0);
  const total = Math.max(0, subtotal - (Number.isFinite(discountNum) ? discountNum : 0));
  const cashNum = Number(cashTendered || 0);
  const change = Number.isFinite(cashNum) ? Math.max(0, cashNum - total) : 0;
  const cashOk = paymentMethod === "DIGITAL" || cashNum >= total;
  const canCheckout =
    lines.length > 0 && total > 0 && cashOk && !state.saleRef;

  function handleScan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = scanInput.trim();
    if (!code) return;
    setScanError(null);
    startScan(async () => {
      const result = await scanBarcodeAction(code);
      if (!result.ok) {
        setScanError(result.error);
        return;
      }
      const product = result.product;
      setLines((prev) => {
        const existing = prev.find((l) => l.productId === product.id);
        if (existing) {
          if (existing.qty + 1 > product.currentStock) {
            setScanError(`Only ${product.currentStock} in stock for ${product.name}`);
            return prev;
          }
          return prev.map((l) =>
            l.productId === product.id ? { ...l, qty: l.qty + 1 } : l,
          );
        }
        if (product.currentStock < 1) {
          setScanError(`${product.name} is out of stock`);
          return prev;
        }
        return [
          ...prev,
          {
            productId: product.id,
            name: product.name,
            brand: product.brand,
            code: product.barcode ?? product.sku ?? "",
            unitPrice: product.sellPrice,
            qty: 1,
            discount: "0",
            currentStock: product.currentStock,
          },
        ];
      });
      setScanInput("");
      scanRef.current?.focus();
    });
  }

  function updateLine(productId: string, patch: Partial<CartLine>) {
    setLines((prev) =>
      prev.map((l) => (l.productId === productId ? { ...l, ...patch } : l)),
    );
  }

  function removeLine(productId: string) {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }

  function clearCart() {
    setLines([]);
    setSaleDiscount("0");
    setCashTendered("");
    setPaymentMethod("CASH");
    setScanError(null);
    scanRef.current?.focus();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <form onSubmit={handleScan} className="flex gap-2">
          <input
            ref={scanRef}
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            placeholder="Scan or type barcode / SKU…"
            className={inputClass("font-mono")}
            autoComplete="off"
            aria-label="Barcode"
          />
          <button
            type="submit"
            className="btn-secondary whitespace-nowrap"
            disabled={scanPending}
          >
            {scanPending ? "Looking…" : "Add"}
          </button>
        </form>
        {scanError ? (
          <p role="alert" className="text-sm text-rose-300">
            {scanError}
          </p>
        ) : null}

        <div className="overflow-hidden rounded-lg border border-white/10 bg-card">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">Discount</th>
                <th className="px-4 py-3 text-right">Line</th>
                <th className="px-2 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {lines.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-ink-muted"
                  >
                    Scan a barcode to begin.
                  </td>
                </tr>
              ) : (
                lines.map((line) => {
                  const lineTotal =
                    Number(line.unitPrice) * line.qty -
                    Number(line.discount || 0);
                  return (
                    <tr key={line.productId}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-ink">{line.name}</div>
                        <div className="text-xs text-ink-muted">
                          {line.brand ? `${line.brand} · ` : ""}
                          <span className="font-mono">{line.code}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                        {line.unitPrice}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          max={line.currentStock}
                          value={line.qty}
                          onChange={(e) =>
                            updateLine(line.productId, {
                              qty: Math.max(1, Number(e.target.value) || 1),
                            })
                          }
                          className={inputClass("w-20 text-right")}
                          aria-label="Quantity"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.discount}
                          onChange={(e) =>
                            updateLine(line.productId, {
                              discount: e.target.value,
                            })
                          }
                          className={inputClass("w-24 text-right")}
                          aria-label="Line discount"
                        />
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-ink">
                        {lineTotal.toFixed(2)}
                      </td>
                      <td className="px-2 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => removeLine(line.productId)}
                          className="text-xs text-ink-muted hover:text-rose-300"
                          aria-label="Remove line"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <form action={formAction} className="space-y-4">
        {lines.map((line, index) => (
          <div key={line.productId}>
            <input
              type="hidden"
              name={`items.${index}.productId`}
              value={line.productId}
            />
            <input type="hidden" name={`items.${index}.qty`} value={line.qty} />
            <input
              type="hidden"
              name={`items.${index}.unitPrice`}
              value={line.unitPrice}
            />
            <input
              type="hidden"
              name={`items.${index}.discountAmount`}
              value={line.discount || "0"}
            />
          </div>
        ))}
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

        <div className="rounded-lg border border-white/10 bg-card p-4">
          <h2 className="text-sm font-semibold text-ink">Checkout</h2>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-muted">Subtotal</dt>
              <dd className="tabular-nums text-ink">{subtotal.toFixed(2)}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-ink-muted">Sale discount</dt>
              <input
                name="saleDiscount"
                type="number"
                min="0"
                step="0.01"
                value={saleDiscount}
                onChange={(e) => setSaleDiscount(e.target.value)}
                className={inputClass("w-28 text-right")}
                aria-label="Sale discount"
              />
            </div>
            <div className="flex justify-between border-t border-white/10 pt-2 text-base">
              <dt className="font-semibold text-ink">Total</dt>
              <dd className="tabular-nums font-semibold text-ink">
                {total.toFixed(2)}
              </dd>
            </div>
          </dl>

          <div className="mt-4 space-y-3">
            <PaymentMethodToggle
              value={paymentMethod}
              onChange={setPaymentMethod}
            />
            <input
              type="hidden"
              name="paymentMethod"
              value={paymentMethod}
            />

            {paymentMethod === "CASH" ? (
              <>
                <Field
                  label="Cash tendered"
                  htmlFor="cashTendered"
                  required
                  error={state.fieldErrors.cashTendered}
                >
                  <input
                    id="cashTendered"
                    name="cashTendered"
                    type="number"
                    min="0"
                    step="0.01"
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    className={inputClass("text-right")}
                  />
                </Field>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-muted">Change</span>
                  <span className="tabular-nums font-medium text-ink">
                    {change.toFixed(2)}
                  </span>
                </div>
              </>
            ) : (
              <input type="hidden" name="cashTendered" value="0" />
            )}

            <Field label="Notes" htmlFor="notes" error={state.fieldErrors.notes}>
              <textarea id="notes" name="notes" rows={2} className={inputClass()} />
            </Field>
          </div>
        </div>

        <FormError message={state.formError} />

        <div className="flex gap-3">
          <SubmitButton pendingLabel="Processing…">
            {canCheckout ? `Charge ${total.toFixed(2)}` : "Charge"}
          </SubmitButton>
          <button
            type="button"
            onClick={clearCart}
            className="btn-secondary"
            disabled={lines.length === 0}
          >
            Clear
          </button>
        </div>
        {!canCheckout && lines.length > 0 && paymentMethod === "CASH" ? (
          <p className="text-xs text-ink-muted">
            Enter cash tendered of at least {total.toFixed(2)} to charge.
          </p>
        ) : null}
      </form>
    </div>
  );
}

function PaymentMethodToggle({
  value,
  onChange,
}: {
  value: "CASH" | "DIGITAL";
  onChange: (next: "CASH" | "DIGITAL") => void;
}) {
  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-ink-muted">
        Payment method
      </span>
      <div
        role="radiogroup"
        aria-label="Payment method"
        className="grid grid-cols-2 gap-2"
      >
        {(["CASH", "DIGITAL"] as const).map((option) => {
          const selected = value === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                selected
                  ? "border-rose-400 bg-rose-500/15 text-rose-200"
                  : "border-white/10 bg-surface/60 text-ink-soft hover:border-white/20 hover:text-ink"
              }`}
            >
              {option === "CASH" ? "Cash" : "Digital"}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function cryptoRandomKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
