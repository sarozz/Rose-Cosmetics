/**
 * Barcode → product metadata lookup against Open Beauty Facts.
 *
 * OBF is a free, community-maintained catalogue of cosmetic products with
 * an unauthenticated JSON API. Unknown barcodes come back as `{ status: 0 }`
 * rather than a 404, so we detect that case and return null. Transport
 * failures are swallowed — the UI treats "no hit" and "lookup failed" the
 * same way: the cashier fills the form in manually.
 *
 * Response shape docs: https://openbeautyfacts.github.io/openbeautyfacts-server/api/
 */

import { isValidBarcodeFormat } from "@/lib/validation/barcode";

const OBF_BASE = "https://world.openbeautyfacts.org/api/v2/product";
const USER_AGENT = "RoseCosmeticsPOS/1.0 (+https://rose-cosmetics.local)";
// Keep the timeout tight — the cashier is waiting; a slow API is as bad as
// no API for their flow.
const LOOKUP_TIMEOUT_MS = 4000;

export type BarcodeLookupHit = {
  barcode: string;
  name: string | null;
  brand: string | null;
  /** Raw category strings from OBF, most specific last. */
  categoryHints: string[];
};

type OBFProduct = {
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  categories?: string;
  categories_tags?: string[];
};

type OBFResponse = {
  status: 0 | 1;
  product?: OBFProduct;
};

export async function lookupBarcode(
  rawBarcode: string,
): Promise<BarcodeLookupHit | null> {
  const barcode = rawBarcode.trim();
  if (!isValidBarcodeFormat(barcode)) return null;

  const url = `${OBF_BASE}/${encodeURIComponent(barcode)}.json`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      // OBF data changes slowly; cache at the Next fetch layer for a day so
      // the second cashier to scan the same box doesn't re-hit the network.
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as OBFResponse;
    if (body.status !== 1 || !body.product) return null;
    return parseProduct(barcode, body.product);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function parseProduct(barcode: string, p: OBFProduct): BarcodeLookupHit {
  return {
    barcode,
    name: firstNonEmpty(p.product_name, p.product_name_en),
    brand: firstBrand(p.brands),
    categoryHints: extractCategoryHints(p),
  };
}

function firstNonEmpty(...values: (string | undefined)[]): string | null {
  for (const v of values) {
    if (typeof v !== "string") continue;
    const t = v.trim();
    if (t) return t;
  }
  return null;
}

function firstBrand(brands: string | undefined): string | null {
  if (!brands) return null;
  const first = brands.split(",")[0]?.trim();
  return first ? first : null;
}

/**
 * Extract plain-language category hints from the OBF payload. OBF stores
 * categories two ways:
 *   - `categories`: comma-separated free text (e.g. "Cosmetics, Lipsticks")
 *   - `categories_tags`: namespaced tags (e.g. "en:lipsticks") — more stable
 *     across languages.
 * We prefer the English tag slugs and fall back to free text. We dedupe,
 * normalize, and return most-specific-last so the UI can prefer the tail.
 */
function extractCategoryHints(p: OBFProduct): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  const push = (raw: string) => {
    const normalized = raw.trim();
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(normalized);
  };

  if (Array.isArray(p.categories_tags)) {
    for (const tag of p.categories_tags) {
      if (typeof tag !== "string") continue;
      // Strip the language prefix ("en:lipsticks" → "lipsticks") and
      // humanize the hyphens.
      const withoutPrefix = tag.includes(":") ? tag.split(":")[1] : tag;
      const humanized = withoutPrefix.replace(/-/g, " ");
      push(humanized);
    }
  }

  if (typeof p.categories === "string") {
    for (const part of p.categories.split(",")) push(part);
  }

  return out;
}

/**
 * Match the category hints (most-specific-first preferred) against the
 * shop's existing categories by case-insensitive name. Returns the first
 * match or null. We never auto-create categories — that's an explicit
 * OWNER/MANAGER action.
 */
export function matchCategory(
  hints: string[],
  categories: { id: string; name: string }[],
): { id: string; name: string } | null {
  if (hints.length === 0 || categories.length === 0) return null;
  const byName = new Map(
    categories.map((c) => [c.name.trim().toLowerCase(), c]),
  );
  // Walk hints from most-specific (last) to most-general.
  for (let i = hints.length - 1; i >= 0; i--) {
    const hit = byName.get(hints[i].trim().toLowerCase());
    if (hit) return hit;
  }
  return null;
}
