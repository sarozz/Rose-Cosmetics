/**
 * Cross-service cache tag constants. Listing data is wrapped in
 * `unstable_cache` with these tags so reads are served from the Vercel
 * data cache, then mutations invalidate the relevant tag with
 * `revalidateTag`.
 *
 * Keep tag values short string literals — they end up in the cache key.
 *
 * Sale / receiving / refund flows that affect stock should invalidate
 * `STOCK` since that's what `inventorySnapshot` and `listProducts` key
 * off (their on-hand columns change).
 */
export const CATALOG_TAGS = {
  PRODUCTS: "catalog:products",
  CATEGORIES: "catalog:categories",
  SUPPLIERS: "catalog:suppliers",
  /** Anything that displays "current stock" (inventory page, product list). */
  STOCK: "catalog:stock",
} as const;

export type CatalogTag = (typeof CATALOG_TAGS)[keyof typeof CATALOG_TAGS];
