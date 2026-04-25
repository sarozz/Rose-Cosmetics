/**
 * Lookup product info from Open Beauty Facts (https://world.openbeautyfacts.org).
 * Free, open data, no API key. We use it to auto-fill the catalog form when
 * the cashier scans a barcode for a product they haven't entered before.
 *
 * The Beauty Facts coverage is best for European/American cosmetics; many
 * regional brands won't be in the database and we silently fall back to
 * `null` so the cashier just fills the fields manually.
 */

const API_BASE = "https://world.openbeautyfacts.org/api/v2/product";
const REQUEST_TIMEOUT_MS = 5000;

export type ExternalProduct = {
  /** Best-guess product display name. */
  name: string | null;
  /** Brand string from the database — may be a comma-separated list, we keep it raw. */
  brand: string | null;
  /** First / most-specific category tag, humanised — e.g. "Lipsticks". */
  categoryHint: string | null;
  /** Front image URL if the database has one. */
  imageUrl: string | null;
  /** Where the data came from, for the UI footer. */
  source: "openbeautyfacts";
};

export type LookupResult =
  | { ok: true; product: ExternalProduct }
  | { ok: false; reason: "invalid-barcode" | "not-found" | "network-error" };

function isValidBarcode(value: string): boolean {
  // EAN-8, UPC-A, EAN-13, ITF-14 — the lookup database is keyed on numeric
  // codes only, so reject anything else early.
  return /^\d{8,14}$/.test(value);
}

function humaniseCategoryTag(tag: string): string {
  // "en:lip-sticks" -> "Lip sticks"
  const stripped = tag.replace(/^[a-z]{2}:/, "").replace(/-/g, " ");
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

export async function lookupBeautyByBarcode(
  barcode: string,
): Promise<LookupResult> {
  const trimmed = barcode.trim();
  if (!isValidBarcode(trimmed)) {
    return { ok: false, reason: "invalid-barcode" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/${trimmed}.json`, {
      signal: controller.signal,
      headers: {
        // Open Beauty Facts requests a meaningful user-agent so they can
        // throttle abusive clients without affecting honest ones.
        "User-Agent": "RoseCosmeticsPOS/1.0 (catalog auto-fill)",
        Accept: "application/json",
      },
      // The data updates often enough that we don't want a cached miss to
      // shadow a recently-added product.
      cache: "no-store",
    });
    if (!res.ok) {
      return { ok: false, reason: "network-error" };
    }
    const json = (await res.json()) as {
      status?: number;
      product?: {
        product_name?: string;
        product_name_en?: string;
        brands?: string;
        categories_tags?: string[];
        image_url?: string;
        image_front_url?: string;
        image_front_small_url?: string;
      };
    };
    if (json.status !== 1 || !json.product) {
      return { ok: false, reason: "not-found" };
    }
    const p = json.product;
    const tag = p.categories_tags?.[p.categories_tags.length - 1] ?? null;
    return {
      ok: true,
      product: {
        name: (p.product_name || p.product_name_en || "").trim() || null,
        brand: (p.brands ?? "").trim() || null,
        categoryHint: tag ? humaniseCategoryTag(tag) : null,
        imageUrl:
          p.image_front_small_url || p.image_front_url || p.image_url || null,
        source: "openbeautyfacts",
      },
    };
  } catch {
    return { ok: false, reason: "network-error" };
  } finally {
    clearTimeout(timer);
  }
}
