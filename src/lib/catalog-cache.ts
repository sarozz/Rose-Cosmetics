"use client";

import type { CatalogEntry } from "@/lib/services/inventory";

const REFRESH_INTERVAL_MS = 60_000;

let cache: { items: CatalogEntry[]; loadedAt: number } | null = null;
let inflight: Promise<CatalogEntry[]> | null = null;

/**
 * Shared client-side catalog cache. The browser fetches the slim active-
 * product list once from /api/inventory/catalog, then keeps it warm for
 * the rest of the session. Multiple components (inventory autocomplete,
 * POS scanner, receiving form, online order form) reuse the same memo
 * so we never re-fetch the same payload twice.
 *
 * Safe to call from anywhere a "use client" tree exists. The first
 * caller pays the network round-trip; subsequent callers within
 * REFRESH_INTERVAL_MS get the cached list synchronously-ish.
 */
export async function loadCatalog(force = false): Promise<CatalogEntry[]> {
  const now = Date.now();
  if (!force && cache && now - cache.loadedAt < REFRESH_INTERVAL_MS) {
    return cache.items;
  }
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch("/api/inventory/catalog", { cache: "no-store" });
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

/** Read whatever's already cached without triggering a fetch. */
export function peekCatalog(): CatalogEntry[] | null {
  return cache?.items ?? null;
}

/**
 * Look up by barcode or SKU against the in-memory cache. Returns null on
 * miss so the caller can decide whether to fall back to a server lookup.
 */
export function findByCode(code: string): CatalogEntry | null {
  const trimmed = code.trim();
  if (!trimmed || !cache) return null;
  for (const item of cache.items) {
    if (item.barcode === trimmed || item.sku === trimmed) return item;
  }
  return null;
}

/** Force a refresh — useful after a known stock change in the same tab. */
export function invalidateCatalog() {
  cache = null;
}
