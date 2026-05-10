"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import type { CatalogEntry, InventorySuggestion } from "@/lib/services/inventory";

const MAX_RESULTS = 8;
// Refresh the cached catalog at most once per 60s in the foreground tab.
// Anything more aggressive is wasted work for a small shop where the
// catalog barely moves.
const REFRESH_INTERVAL_MS = 60_000;

let cache: { items: CatalogEntry[]; loadedAt: number } | null = null;
let inflight: Promise<CatalogEntry[]> | null = null;

async function loadCatalog(force = false): Promise<CatalogEntry[]> {
  const now = Date.now();
  if (!force && cache && now - cache.loadedAt < REFRESH_INTERVAL_MS) {
    return cache.items;
  }
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch("/api/inventory/catalog", {
        cache: "no-store",
      });
      if (!res.ok) return cache?.items ?? [];
      const body = (await res.json()) as { items: CatalogEntry[] };
      cache = { items: body.items, loadedAt: Date.now() };
      return body.items;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/**
 * Inventory search box with Google-style autocomplete.
 *
 * The cashier's browser fetches the slim catalog from /api/inventory/catalog
 * once, caches it, and filters in memory on every keystroke. That makes the
 * dropdown effectively instant (no per-keystroke round-trip, no debounce).
 *
 * - Latest-wins: cache state stays stable; a slow refresh can't overwrite
 *   typing.
 * - Combobox a11y: input owns the listbox via aria-controls / -activedescendant,
 *   options carry role="option" and aria-selected.
 * - Plain Enter submits the form (full /inventory?q= filter); Enter on a
 *   highlighted option fills the input with that product's name and submits
 *   so the cashier lands on the same product they picked.
 */
export function InventorySearch({ defaultQuery }: { defaultQuery: string }) {
  const router = useRouter();
  const listboxId = useId();
  const formRef = useRef<HTMLFormElement>(null);

  const [value, setValue] = useState(defaultQuery);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [items, setItems] = useState<CatalogEntry[]>(() => cache?.items ?? []);
  const [loading, setLoading] = useState(() => !cache);

  // Initial fetch + periodic refresh while mounted. We refresh in the
  // background so a stale catalog never blocks the dropdown.
  useEffect(() => {
    let cancelled = false;
    const refresh = async (force = false) => {
      const next = await loadCatalog(force);
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

  // Filter + rank in memory. Same scoring as the previous server path:
  // exact name prefix > brand prefix > name contains > rest, alpha tiebreak.
  const results = useMemo<InventorySuggestion[]>(() => {
    const q = value.trim().toLowerCase();
    if (q.length === 0) return [];
    const scored: { item: CatalogEntry; score: number }[] = [];
    for (const item of items) {
      if (!item.search.includes(q)) continue;
      const name = item.name.toLowerCase();
      const brand = (item.brand ?? "").toLowerCase();
      const score = name.startsWith(q)
        ? 0
        : brand.startsWith(q)
          ? 1
          : name.includes(q)
            ? 2
            : 3;
      scored.push({ item, score });
      // Soft cap: collect 4× the visible window so the sort has room to
      // pick the best matches without scanning the entire catalog twice.
      if (scored.length >= MAX_RESULTS * 8) break;
    }
    scored.sort(
      (a, b) =>
        a.score - b.score || a.item.name.localeCompare(b.item.name),
    );
    return scored
      .slice(0, MAX_RESULTS)
      .map(({ item }) => ({
        id: item.id,
        name: item.name,
        brand: item.brand,
        category: item.category,
        sellPrice: item.sellPrice,
        currentStock: item.currentStock,
        status: item.status,
      }));
  }, [items, value]);

  function selectSuggestion(s: InventorySuggestion) {
    setValue(s.name);
    setOpen(false);
    setActive(-1);
    router.push(`/inventory?q=${encodeURIComponent(s.name)}` as Route);
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      if (results.length === 0) return;
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      if (results.length === 0) return;
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      if (open && active >= 0 && active < results.length) {
        e.preventDefault();
        selectSuggestion(results[active]);
      }
      // else fall through to native form submit (filter to typed query)
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
        setActive(-1);
      }
    }
  }

  const showDropdown =
    open && value.trim().length > 0 && (results.length > 0 || loading);

  return (
    <form
      ref={formRef}
      action="/inventory"
      method="get"
      className="relative"
      onSubmit={() => {
        // Closing the dropdown before the navigation avoids a flash of stale
        // suggestions during the route change.
        setOpen(false);
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-muted"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path
            d="m20 20-3-3"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <input
        type="search"
        name="q"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setActive(-1);
          setOpen(true);
        }}
        onFocus={() => {
          if (value.trim().length > 0) setOpen(true);
        }}
        onBlur={() => {
          // Delay so a click on an option still registers before close.
          setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={handleKey}
        placeholder="Search inventory…"
        aria-label="Search inventory"
        autoComplete="off"
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls={listboxId}
        aria-activedescendant={
          active >= 0 ? `${listboxId}-${active}` : undefined
        }
        className="block w-full rounded-lg border border-white/10 bg-surface/60 py-2.5 pl-9 pr-9 text-sm text-ink placeholder:text-ink-muted transition-colors hover:border-white/20 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/30"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setValue("");
            setOpen(false);
            setActive(-1);
            router.push("/inventory");
          }}
          className="absolute inset-y-0 right-3 flex items-center text-ink-muted hover:text-ink"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
            <path
              d="M6 6l12 12M6 18 18 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}

      {showDropdown ? (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-1 max-h-[60vh] overflow-y-auto rounded-lg border border-white/10 bg-card shadow-xl backdrop-blur-sm"
        >
          {results.length === 0 && loading ? (
            <li
              role="option"
              aria-selected="false"
              className="px-4 py-3 text-sm text-ink-muted"
            >
              Loading catalog…
            </li>
          ) : null}
          {results.length === 0 && !loading ? (
            <li
              role="option"
              aria-selected="false"
              className="px-4 py-3 text-sm text-ink-muted"
            >
              No matches
            </li>
          ) : null}
          {results.map((r, i) => (
            <li
              key={r.id}
              id={`${listboxId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                // Prevent the input's blur from racing the click handler.
                e.preventDefault();
              }}
              onMouseEnter={() => setActive(i)}
              onClick={() => selectSuggestion(r)}
              className={`flex cursor-pointer items-center justify-between gap-3 border-b border-white/5 px-4 py-2.5 last:border-b-0 ${
                i === active ? "bg-rose-500/10" : "hover:bg-white/5"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-ink">
                  {r.name}
                </div>
                <div className="truncate text-xs text-ink-muted">
                  {[r.brand, r.category].filter(Boolean).join(" · ") || "—"}
                </div>
              </div>
              <div className="flex flex-shrink-0 flex-col items-end gap-1">
                <span className="text-sm tabular-nums text-ink">
                  Rs {r.sellPrice}
                </span>
                <StockChip
                  stock={r.currentStock}
                  status={r.status}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}

function StockChip({
  stock,
  status,
}: {
  stock: number;
  status: InventorySuggestion["status"];
}) {
  const cls =
    status === "OUT"
      ? "bg-rose-500/15 text-rose-200"
      : status === "LOW"
        ? "bg-amber-500/15 text-amber-200"
        : "bg-emerald-500/15 text-emerald-200";
  const label =
    status === "OUT" ? "Out" : status === "LOW" ? `Low · ${stock}` : `${stock} on hand`;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${cls}`}
    >
      {label}
    </span>
  );
}
