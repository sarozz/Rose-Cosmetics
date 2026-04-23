"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { Field, FieldGroup, inputClass } from "@/components/form/field";
import { FormError } from "@/components/form/form-error";
import { SubmitButton } from "@/components/form/submit-button";
import { createCloseAction } from "./actions";
import { emptyCloseState } from "./state";

type Preview = {
  periodStart: string;
  periodEnd: string;
  cashSalesTotal: string;
  digitalSalesTotal: string;
  cardSalesTotal: string;
  cashRefundsTotal: string;
  salesCount: number;
  previousCloseAt: string | null;
};

export function CloseForm({ preview }: { preview: Preview }) {
  const router = useRouter();
  const [state, formAction] = useFormState(createCloseAction, emptyCloseState);
  const [openingFloat, setOpeningFloat] = useState("0");
  const [countedCash, setCountedCash] = useState("");

  useEffect(() => {
    if (state.closeId) {
      router.push(`/close/${state.closeId}` as Route);
    }
  }, [state.closeId, router]);

  const expected = useMemo(() => {
    const float = Number(openingFloat || 0);
    const sales = Number(preview.cashSalesTotal);
    const refunds = Number(preview.cashRefundsTotal);
    const v = float + sales - refunds;
    return Number.isFinite(v) ? v : 0;
  }, [openingFloat, preview.cashSalesTotal, preview.cashRefundsTotal]);

  const counted = Number(countedCash || 0);
  const variance = Number.isFinite(counted) ? counted - expected : 0;
  const varianceClass =
    variance === 0
      ? "text-ink"
      : variance > 0
        ? "text-emerald-300"
        : "text-rose-300";

  return (
    <form action={formAction} className="space-y-8">
      <FormError message={state.formError} />

      <section className="rounded-lg border border-white/10 bg-card p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-rose-300">
          Period
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          {preview.previousCloseAt
            ? `Since last close on ${formatDateTime(preview.previousCloseAt)}`
            : "Since the first sale recorded"}{" "}
          · through {formatDateTime(preview.periodEnd)}
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label="Sales" value={String(preview.salesCount)} />
          <Stat label="Cash sales" value={preview.cashSalesTotal} />
          <Stat label="Digital sales" value={preview.digitalSalesTotal} />
          <Stat label="Cash refunds" value={preview.cashRefundsTotal} />
        </dl>
      </section>

      <FieldGroup title="Count">
        <Field
          label="Opening float"
          htmlFor="openingFloat"
          hint="Cash that was in the drawer at the start of the shift."
          error={state.fieldErrors.openingFloat}
        >
          <input
            id="openingFloat"
            name="openingFloat"
            type="number"
            min="0"
            step="0.01"
            value={openingFloat}
            onChange={(e) => setOpeningFloat(e.target.value)}
            className={inputClass("text-right")}
          />
        </Field>

        <Field
          label="Counted cash"
          htmlFor="countedCash"
          required
          hint="What you physically counted in the till just now."
          error={state.fieldErrors.countedCash}
        >
          <input
            id="countedCash"
            name="countedCash"
            type="number"
            min="0"
            step="0.01"
            autoFocus
            value={countedCash}
            onChange={(e) => setCountedCash(e.target.value)}
            className={inputClass("text-right")}
          />
        </Field>

        <Field
          label="Notes"
          htmlFor="notes"
          hint="Optional — explain any variance (cash drop, manager correction, etc.)."
          error={state.fieldErrors.notes}
        >
          <textarea id="notes" name="notes" rows={2} className={inputClass()} />
        </Field>
      </FieldGroup>

      <section className="rounded-lg border border-white/10 bg-card p-4">
        <dl className="space-y-2 text-sm">
          <Row label="Expected cash">
            <span className="tabular-nums font-medium text-ink">
              {expected.toFixed(2)}
            </span>
          </Row>
          <Row label="Counted">
            <span className="tabular-nums text-ink-soft">
              {counted.toFixed(2)}
            </span>
          </Row>
          <div className="flex justify-between border-t border-white/10 pt-2 text-base">
            <dt className="font-semibold text-ink">Variance</dt>
            <dd className={`tabular-nums font-semibold ${varianceClass}`}>
              {formatVariance(variance)}
            </dd>
          </div>
        </dl>
      </section>

      <div className="flex gap-3">
        <SubmitButton pendingLabel="Recording…">Record close</SubmitButton>
        <Link href="/close" className="btn-secondary">
          Cancel
        </Link>
      </div>
    </form>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="tabular-nums font-medium text-ink">{value}</dd>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between">
      <dt className="text-ink-muted">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function formatDateTime(iso: string): string {
  return iso.replace("T", " ").slice(0, 16);
}

function formatVariance(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "0.00";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}`;
}
