"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useMemo, useState } from "react";
import type { SaleTableEntry } from "@/lib/services/sale";

const REFRESH_INTERVAL_MS = 30_000;

let cache: { items: SaleTableEntry[]; loadedAt: number } | null = null;
let inflight: Promise<SaleTableEntry[]> | null = null;

async function loadList(force = false): Promise<SaleTableEntry[]> {
  const now = Date.now();
  if (!force && cache && now - cache.loadedAt < REFRESH_INTERVAL_MS) {
    return cache.items;
  }
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch("/api/sales/list", { cache: "no-store" });
      if (!res.ok) return cache?.items ?? [];
      const body = (await res.json()) as { items: SaleTableEntry[] };
      cache = { items: body.items, loadedAt: Date.now() };
      return body.items;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/**
 * Sales table with instant client-side filtering by SR or cashier name.
 * Fetches the slim list once on mount, refreshes every 30s in the
 * background. Same pattern as products + inventory autocomplete.
 */
export function SalesClient({ canRefund }: { canRefund: boolean }) {
  const [items, setItems] = useState<SaleTableEntry[]>(() => cache?.items ?? []);
  const [loading, setLoading] = useState(() => !cache);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    const refresh = async (force = false) => {
      const next = await loadList(force);
      if (cancelled) return;
      setItems(next);
      setLoading(false);
    };
    void refresh();
    const id = window.setInterval(() => void refresh(true), REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((s) => s.search.includes(q));
  }, [items, query]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[16rem]">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-muted"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="m20 20-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by SR number or cashier name"
            autoComplete="off"
            className="block w-full rounded-md border border-white/10 bg-surface/60 py-2 pl-9 pr-3 text-sm placeholder:text-ink-muted focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/30"
          />
        </div>
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="text-sm text-ink-muted hover:underline"
          >
            Clear
          </button>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-lg border border-white/10 bg-card">
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-4 py-3">SR number</th>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Cashier</th>
              <th className="px-4 py-3 text-right">Lines</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Paid via</th>
              <th className="px-4 py-3" aria-label="Actions" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading && items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-ink-muted">
                  Loading sales…
                </td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-ink-muted">
                  {query ? `No sales match "${query}".` : "No sales yet."}
                </td>
              </tr>
            ) : (
              visible.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-mono text-xs text-ink">
                    {s.saleRef}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-soft">
                    {s.soldAt.replace("T", " ").slice(0, 16)}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{s.cashierName}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                    {s.itemCount}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-ink">
                    {s.total}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-soft">
                    {s.paymentLabels.join(" / ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canRefund ? (
                      <Link
                        href={
                          `/returns/new?sale=${encodeURIComponent(s.saleRef)}` as Route
                        }
                        className="text-rose-300 hover:underline"
                      >
                        Return
                      </Link>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
