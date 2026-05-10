"use client";

import { useState, useTransition } from "react";
import type { OnlineOrderStatus } from "@prisma/client";
import { updateStatusAction } from "../actions";

const STATUS_LABEL: Record<OnlineOrderStatus, string> = {
  CONFIRMED: "Confirmed",
  PACKAGING: "Packaging",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export function StatusForm({
  orderId,
  available,
}: {
  orderId: string;
  available: OnlineOrderStatus[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<OnlineOrderStatus | null>(null);
  const [note, setNote] = useState("");

  if (available.length === 0) {
    return (
      <p className="rounded-md border border-white/10 bg-page/40 px-3 py-2 text-xs text-ink-muted">
        Order complete — no further transitions.
      </p>
    );
  }

  function fire(target: OnlineOrderStatus) {
    setError(null);
    const fd = new FormData();
    fd.set("status", target);
    fd.set("note", note);
    startTransition(async () => {
      const result = await updateStatusAction(orderId, fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setConfirming(null);
      setNote("");
    });
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p role="alert" className="text-xs text-rose-300">
          {error}
        </p>
      ) : null}
      {confirming ? (
        <div className="rounded-lg border border-white/10 bg-page/40 p-3">
          <p className="text-sm text-ink">
            Mark order as <strong>{STATUS_LABEL[confirming]}</strong>?
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note for the customer (visible on the tracking page)"
            rows={2}
            className="mt-2 block w-full rounded-md border border-white/10 bg-surface/60 px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/30"
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => fire(confirming)}
              disabled={pending}
              className={`btn-primary text-sm ${
                confirming === "CANCELLED" ? "!bg-rose-600 hover:!bg-rose-500" : ""
              }`}
            >
              {pending ? "Updating…" : `Yes, mark ${STATUS_LABEL[confirming].toLowerCase()}`}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(null);
                setNote("");
              }}
              disabled={pending}
              className="btn-secondary text-sm"
            >
              Back
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {available.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setConfirming(s)}
              className={
                s === "CANCELLED"
                  ? "rounded-md border border-rose-400/40 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-200 hover:bg-rose-500/20"
                  : "btn-primary text-xs"
              }
            >
              Mark {STATUS_LABEL[s].toLowerCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
