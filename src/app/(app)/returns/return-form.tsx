"use client";

import { useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { Field, inputClass } from "@/components/form/field";
import { FormError } from "@/components/form/form-error";
import { SubmitButton } from "@/components/form/submit-button";
import { emptyReturnState, type ReturnFormState } from "./state";

type SaleLine = {
  id: string;
  productName: string;
  barcode: string | null;
  qty: number;
  unitPrice: string;
  lineTotal: string;
  refundedQty: number;
  refundableQty: number;
  refundableAmount: string;
};

type Sale = {
  id: string;
  saleRef: string;
  total: string;
  lines: SaleLine[];
};

type Row = {
  selected: boolean;
  qty: string;
  refundAmount: string;
  restockFlag: boolean;
};

export function ReturnForm({
  action,
  sale,
}: {
  action: (
    state: ReturnFormState,
    formData: FormData,
  ) => Promise<ReturnFormState>;
  sale: Sale;
}) {
  const [state, formAction] = useFormState(action, emptyReturnState);
  const [rows, setRows] = useState<Record<string, Row>>(() =>
    Object.fromEntries(
      sale.lines.map((l) => [
        l.id,
        {
          selected: false,
          qty: l.refundableQty > 0 ? String(l.refundableQty) : "",
          refundAmount: l.refundableAmount,
          restockFlag: true,
        },
      ]),
    ),
  );

  function updateRow(lineId: string, patch: Partial<Row>) {
    setRows((prev) => ({ ...prev, [lineId]: { ...prev[lineId], ...patch } }));
  }

  const refundTotal = useMemo(() => {
    return sale.lines.reduce((sum, line) => {
      const row = rows[line.id];
      if (!row?.selected) return sum;
      const amount = Number(row.refundAmount);
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);
  }, [rows, sale.lines]);

  const anySelected = Object.values(rows).some((r) => r.selected);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="originalSaleId" value={sale.id} />

      <div className="rounded-lg border border-white/10 bg-card">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">
            Sale <span className="font-mono">{sale.saleRef}</span>
          </h2>
          <span className="text-sm text-ink-muted">
            Total <span className="tabular-nums font-medium text-ink">{sale.total}</span>
          </span>
        </div>
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="w-10 px-4 py-3" />
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3 text-right">Sold</th>
              <th className="px-4 py-3 text-right">Refundable</th>
              <th className="px-4 py-3 text-right">Refund qty</th>
              <th className="px-4 py-3 text-right">Refund amount</th>
              <th className="px-4 py-3 text-center">Restock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sale.lines.map((line, index) => {
              const row = rows[line.id];
              const disabled = line.refundableQty === 0;
              return (
                <tr key={line.id} className={disabled ? "opacity-60" : ""}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      name={`items.${index}.selected`}
                      checked={row.selected}
                      disabled={disabled}
                      onChange={(e) =>
                        updateRow(line.id, { selected: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-white/10 text-rose-400 focus:ring-rose-400"
                      aria-label={`Select ${line.productName}`}
                    />
                    <input
                      type="hidden"
                      name={`items.${index}.saleItemId`}
                      value={line.id}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{line.productName}</div>
                    {line.barcode ? (
                      <div className="font-mono text-xs text-ink-muted">
                        {line.barcode}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                    {line.qty}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                    {line.refundableQty}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      name={`items.${index}.qty`}
                      min="1"
                      step="1"
                      max={line.refundableQty}
                      value={row.qty}
                      disabled={disabled || !row.selected}
                      onChange={(e) => updateRow(line.id, { qty: e.target.value })}
                      className={inputClass("w-20 text-right")}
                      aria-label="Refund quantity"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      name={`items.${index}.refundAmount`}
                      min="0"
                      step="0.01"
                      value={row.refundAmount}
                      disabled={disabled || !row.selected}
                      onChange={(e) =>
                        updateRow(line.id, { refundAmount: e.target.value })
                      }
                      className={inputClass("w-28 text-right")}
                      aria-label="Refund amount"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      name={`items.${index}.restockFlag`}
                      value="on"
                      checked={row.restockFlag}
                      disabled={disabled || !row.selected}
                      onChange={(e) =>
                        updateRow(line.id, { restockFlag: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-white/10 text-rose-400 focus:ring-rose-400"
                      aria-label="Restock"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-surface text-sm">
            <tr>
              <td colSpan={5} className="px-4 py-3 text-right text-ink-muted">
                Refund total
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-semibold text-ink">
                {refundTotal.toFixed(2)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <Field label="Reason / note" htmlFor="reasonNote" error={state.fieldErrors.reasonNote}>
        <textarea
          id="reasonNote"
          name="reasonNote"
          rows={2}
          className={inputClass()}
          placeholder="Damaged, wrong item, changed mind…"
        />
      </Field>

      <FormError message={state.formError} />

      <div className="flex gap-3">
        <SubmitButton pendingLabel="Processing…">
          {anySelected ? `Refund ${refundTotal.toFixed(2)}` : "Refund"}
        </SubmitButton>
        <a href="/returns" className="btn-secondary">
          Cancel
        </a>
      </div>
    </form>
  );
}
