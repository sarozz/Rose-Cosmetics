"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Field, inputClass } from "@/components/form/field";
import { FormError } from "@/components/form/form-error";
import {
  quickCreateProductAction,
  type QuickCreateResult,
  type ReceivingProductOption,
} from "./barcode-actions";

type Props = {
  open: boolean;
  barcode: string;
  source: "open-beauty-facts" | "unknown";
  prefill: { name: string; brand: string; categoryId: string };
  categories: { id: string; name: string }[];
  onClose: () => void;
  onCreated: (product: ReceivingProductOption) => void;
};

/**
 * Inline "quick create" dialog opened when a scanned barcode isn't in our
 * catalog yet. If Open Beauty Facts recognised the code, name/brand/
 * category come pre-filled; otherwise the fields are blank and only the
 * barcode is preserved.
 *
 * Kept deliberately minimal — only the fields needed to record a purchase
 * line. Reorder level, SKU, and image remain defaulted and can be set
 * later on the product detail page.
 */
export function QuickCreateDialog({
  open,
  barcode,
  source,
  prefill,
  categories,
  onClose,
  onCreated,
}: Props) {
  const titleId = useId();
  const nameRef = useRef<HTMLInputElement | null>(null);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(prefill.name);
  const [brand, setBrand] = useState(prefill.brand);
  const [categoryId, setCategoryId] = useState(prefill.categoryId);
  const [costPrice, setCostPrice] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Reset local state whenever we reopen for a different barcode — otherwise
  // leftover pricing from the last scan would bleed into the next one.
  useEffect(() => {
    if (!open) return;
    setName(prefill.name);
    setBrand(prefill.brand);
    setCategoryId(prefill.categoryId);
    setCostPrice("");
    setSellPrice("");
    setErrors({});
    setFormError(null);
    // Focus the first empty field after the browser paints.
    const t = requestAnimationFrame(() => {
      if (prefill.name) {
        // OBF filled the name — jump straight to cost.
        const el = document.getElementById(
          "qc-costPrice",
        ) as HTMLInputElement | null;
        el?.focus();
      } else {
        nameRef.current?.focus();
      }
    });
    return () => cancelAnimationFrame(t);
  }, [open, prefill]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    startTransition(async () => {
      const result: QuickCreateResult = await quickCreateProductAction({
        barcode,
        name,
        brand,
        categoryId,
        costPrice,
        sellPrice,
      });
      if (!result.ok) {
        setErrors(result.fieldErrors);
        setFormError(result.formError);
        return;
      }
      onCreated(result.product);
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl rounded-xl border border-white/10 bg-card shadow-2xl">
        <div className="border-b border-white/10 px-5 py-4">
          <h2 id={titleId} className="text-base font-semibold text-ink">
            New product from scan
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            Barcode{" "}
            <span className="font-mono tabular-nums text-ink">{barcode}</span>{" "}
            {source === "open-beauty-facts"
              ? "— pre-filled from Open Beauty Facts. Review before saving."
              : "— not found in the cosmetic database. Fill in the details."}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4 px-5 py-4">
          <FormError message={formError} />

          <Field
            label="Name"
            htmlFor="qc-name"
            required
            error={errors.name}
          >
            <input
              id="qc-name"
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass()}
              required
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Brand"
              htmlFor="qc-brand"
              error={errors.brand}
            >
              <input
                id="qc-brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className={inputClass()}
              />
            </Field>
            <Field
              label="Category"
              htmlFor="qc-categoryId"
              error={errors.categoryId}
            >
              <select
                id="qc-categoryId"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
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

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Cost price"
              htmlFor="qc-costPrice"
              required
              error={errors.costPrice}
              adornment="Rs"
            >
              <input
                id="qc-costPrice"
                type="number"
                min="0"
                step="0.01"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className={inputClass()}
                required
              />
            </Field>
            <Field
              label="Sell price"
              htmlFor="qc-sellPrice"
              required
              error={errors.sellPrice}
              adornment="Rs"
            >
              <input
                id="qc-sellPrice"
                type="number"
                min="0"
                step="0.01"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                className={inputClass()}
                required
              />
            </Field>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={pending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={pending}
            >
              {pending ? "Saving…" : "Create & add line"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
