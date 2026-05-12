"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useMemo, useState } from "react";
import { DeleteEntityButton } from "@/components/delete-entity-button";
import type { ProductTableEntry } from "@/lib/services/product";
import { deleteProductAction } from "./actions";

const REFRESH_INTERVAL_MS = 30_000;

let cache: { items: ProductTableEntry[]; loadedAt: number } | null = null;
let inflight: Promise<ProductTableEntry[]> | null = null;

async function loadList(force = false): Promise<ProductTableEntry[]> {
  const now = Date.now();
  if (!force && cache && now - cache.loadedAt < REFRESH_INTERVAL_MS) {
    return cache.items;
  }
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch("/api/products/list", { cache: "no-store" });
      if (!res.ok) return cache?.items ?? [];
      const body = (await res.json()) as { items: ProductTableEntry[] };
      cache = { items: body.items, loadedAt: Date.now() };
      return body.items;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/**
 * Products table with instant client-side filtering. Same shape as the
 * inventory autocomplete cache (PR #71/72): fetch the slim list once,
 * filter in memory on every keystroke. Refreshes every 30s in the
 * background so a brand-new product shows up quickly.
 */
export function ProductsClient({ canWrite }: { canWrite: boolean }) {
  const [items, setItems] = useState<ProductTableEntry[]>(() => cache?.items ?? []);
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
    return items.filter((p) => p.search.includes(q));
  }, [items, query]);

  return (
    <>
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
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
            placeholder="Search by name, brand, SKU, barcode, category…"
            autoComplete="off"
            className="block w-full rounded-lg border border-white/10 bg-surface/60 py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted transition-colors hover:border-white/20 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/30"
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
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Barcode</th>
              <th className="px-4 py-3 text-right">Sell</th>
              <th className="px-4 py-3 text-right">On hand</th>
              <th className="px-4 py-3 text-right">Reorder</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" aria-label="Actions" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading && items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-ink-muted">
                  Loading products…
                </td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-ink-muted">
                  {query ? `No products match "${query}".` : "No products yet."}
                </td>
              </tr>
            ) : (
              visible.map((p) => {
                const tracked = p.reorderLevel > 0;
                const low = tracked && p.currentStock <= p.reorderLevel;
                const out = p.currentStock <= 0;
                const stockClass = out
                  ? "text-rose-300"
                  : low
                    ? "text-amber-300"
                    : "text-ink";
                return (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-medium text-ink">
                      <div>{p.name}</div>
                      {p.brand ? (
                        <div className="text-xs text-ink-muted">{p.brand}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{p.category ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-soft">
                      {p.barcode ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {p.sellPrice}
                    </td>
                    <td
                      className={`px-4 py-3 text-right tabular-nums font-medium ${stockClass}`}
                    >
                      {p.currentStock}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                      {tracked ? p.reorderLevel : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {p.isActive ? (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-200">
                          Active
                        </span>
                      ) : (
                        <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-ink-muted">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canWrite ? (
                        <div className="inline-flex items-start gap-4">
                          <Link
                            href={`/products/${p.id}/edit` as Route}
                            className="text-rose-300 hover:underline"
                          >
                            Edit
                          </Link>
                          <DeleteEntityButton
                            id={p.id}
                            name={p.name}
                            action={deleteProductAction}
                          />
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
