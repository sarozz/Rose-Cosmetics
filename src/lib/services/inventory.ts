import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { CATALOG_TAGS } from "./cache-tags";

export type InventoryProduct = {
  id: string;
  name: string;
  brand: string | null;
  sku: string | null;
  barcode: string | null;
  sellPrice: string;
  costPrice: string;
  currentStock: number;
  reorderLevel: number;
  /** "OUT" | "LOW" | "OK" — derived on the server so the client stays dumb. */
  status: "OUT" | "LOW" | "OK";
};

export type InventoryCategory = {
  /** Stable key — real category id, or `__uncategorised__`. */
  key: string;
  name: string;
  skuCount: number;
  units: number;
  /** Sum of sellPrice * currentStock, formatted. */
  retailValue: string;
  products: InventoryProduct[];
};

export type InventorySnapshot = {
  query: string;
  totals: {
    skuCount: number;
    units: number;
    retailValue: string;
    costValue: string;
    outCount: number;
    lowCount: number;
  };
  categories: InventoryCategory[];
};

export type InventorySuggestion = {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  sellPrice: string;
  currentStock: number;
  status: "OUT" | "LOW" | "OK";
};

export type CatalogEntry = InventorySuggestion & {
  /** Lowercase haystacks pre-baked once on the server so client filtering
   *  doesn't redo the work on every keystroke. */
  search: string;
};

/**
 * Slim full-catalog snapshot used by the autocomplete client cache. The
 * cashier's browser fetches this once, then filters in memory on every
 * keystroke — zero round-trips per character. The lowercased haystack
 * is computed here so 1000-product catalogs stay snappy in the browser.
 */
export async function listCatalogForSearch(): Promise<CatalogEntry[]> {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      brand: true,
      sku: true,
      barcode: true,
      sellPrice: true,
      currentStock: true,
      reorderLevel: true,
      category: { select: { name: true } },
    },
    orderBy: [{ name: "asc" }],
  });

  return products.map((p) => {
    const tracked = p.reorderLevel > 0;
    const status: InventorySuggestion["status"] =
      p.currentStock <= 0
        ? "OUT"
        : tracked && p.currentStock <= p.reorderLevel
          ? "LOW"
          : "OK";
    const haystackBits = [
      p.name,
      p.brand ?? "",
      p.sku ?? "",
      p.barcode ?? "",
      p.category?.name ?? "",
    ];
    return {
      id: p.id,
      name: p.name,
      brand: p.brand,
      category: p.category?.name ?? null,
      sellPrice: p.sellPrice.toFixed(2),
      currentStock: p.currentStock,
      status,
      search: haystackBits.join("  ").toLowerCase(),
    };
  });
}

/**
 * Compact, paginated search used by the Inventory autocomplete. Same
 * search predicate as the snapshot view (name / brand / sku / barcode /
 * category) but returns a flat result list capped at `limit` so it's
 * cheap to fire on each keystroke. Suggestions are ordered by relevance
 * heuristic — prefix matches on name first, then everything else.
 */
export async function searchInventorySuggestions(
  query: string,
  limit = 8,
): Promise<InventorySuggestion[]> {
  const q = query.trim();
  if (q.length === 0) return [];

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { brand: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
        { barcode: { contains: q, mode: "insensitive" } },
        { category: { name: { contains: q, mode: "insensitive" } } },
      ],
    },
    include: { category: { select: { name: true } } },
    // Pull a slightly larger window than `limit` so the prefix-match
    // re-ranking has room to choose without clipping good matches.
    take: limit * 2,
    orderBy: [{ name: "asc" }],
  });

  const lower = q.toLowerCase();
  const ranked = products
    .map((p) => {
      const name = p.name.toLowerCase();
      const brand = (p.brand ?? "").toLowerCase();
      const score =
        name.startsWith(lower)
          ? 0
          : brand.startsWith(lower)
            ? 1
            : name.includes(lower)
              ? 2
              : 3;
      return { product: p, score };
    })
    .sort((a, b) => a.score - b.score || a.product.name.localeCompare(b.product.name))
    .slice(0, limit);

  return ranked.map(({ product: p }) => {
    const tracked = p.reorderLevel > 0;
    const status: InventorySuggestion["status"] =
      p.currentStock <= 0
        ? "OUT"
        : tracked && p.currentStock <= p.reorderLevel
          ? "LOW"
          : "OK";
    return {
      id: p.id,
      name: p.name,
      brand: p.brand,
      category: p.category?.name ?? null,
      sellPrice: p.sellPrice.toFixed(2),
      currentStock: p.currentStock,
      status,
    };
  });
}

/**
 * Grouped-by-category snapshot of on-hand stock, with overall totals and
 * per-product status pills derived in one pass. Cashiers use this as a
 * read-only reference during sales; owners/managers get the same view so
 * it doubles as a scan screen without exposing edit controls.
 *
 * Search matches product name, brand, SKU, barcode, or category name —
 * whatever the cashier is most likely to type mid-rush.
 *
 * We pull only `isActive` products so the cashier's view isn't littered
 * with retired SKUs. The `/products` page is still the place for catalog
 * hygiene.
 */
export const inventorySnapshot = unstable_cache(
  async (params: { query?: string } = {}): Promise<InventorySnapshot> => {
  const query = (params.query ?? "").trim();

  const where: Prisma.ProductWhereInput = {
    isActive: true,
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { brand: { contains: query, mode: "insensitive" } },
            { sku: { contains: query, mode: "insensitive" } },
            { barcode: { contains: query, mode: "insensitive" } },
            { category: { name: { contains: query, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const products = await prisma.product.findMany({
    where,
    include: { category: { select: { id: true, name: true } } },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
  });

  let unitsTotal = 0;
  let retailTotal = new Prisma.Decimal(0);
  let costTotal = new Prisma.Decimal(0);
  let outCount = 0;
  let lowCount = 0;

  const buckets = new Map<
    string,
    {
      key: string;
      name: string;
      units: number;
      retail: Prisma.Decimal;
      products: InventoryProduct[];
    }
  >();

  for (const p of products) {
    const stock = p.currentStock;
    const tracked = p.reorderLevel > 0;
    const status: InventoryProduct["status"] =
      stock <= 0 ? "OUT" : tracked && stock <= p.reorderLevel ? "LOW" : "OK";
    if (status === "OUT") outCount += 1;
    if (status === "LOW") lowCount += 1;

    const retail = p.sellPrice.mul(stock);
    const cost = p.costPrice.mul(stock);
    unitsTotal += stock;
    retailTotal = retailTotal.add(retail);
    costTotal = costTotal.add(cost);

    const key = p.category?.id ?? "__uncategorised__";
    const name = p.category?.name ?? "Uncategorised";
    const bucket =
      buckets.get(key) ??
      {
        key,
        name,
        units: 0,
        retail: new Prisma.Decimal(0),
        products: [] as InventoryProduct[],
      };
    bucket.units += stock;
    bucket.retail = bucket.retail.add(retail);
    bucket.products.push({
      id: p.id,
      name: p.name,
      brand: p.brand,
      sku: p.sku,
      barcode: p.barcode,
      sellPrice: p.sellPrice.toFixed(2),
      costPrice: p.costPrice.toFixed(2),
      currentStock: stock,
      reorderLevel: p.reorderLevel,
      status,
    });
    buckets.set(key, bucket);
  }

  const categories: InventoryCategory[] = [...buckets.values()]
    .sort((a, b) => {
      // Uncategorised sinks to the bottom so the named groups lead.
      if (a.key === "__uncategorised__") return 1;
      if (b.key === "__uncategorised__") return -1;
      return a.name.localeCompare(b.name);
    })
    .map((b) => ({
      key: b.key,
      name: b.name,
      skuCount: b.products.length,
      units: b.units,
      retailValue: b.retail.toFixed(2),
      products: b.products,
    }));

    return {
      query,
      totals: {
        skuCount: products.length,
        units: unitsTotal,
        retailValue: retailTotal.toFixed(2),
        costValue: costTotal.toFixed(2),
        outCount,
        lowCount,
      },
      categories,
    };
  },
  ["catalog:inventorySnapshot"],
  // STOCK is invalidated by sales, receiving, returns, adjustments — all the
  // flows that move on-hand. PRODUCTS covers product-level edits (name,
  // category, reorder level, isActive).
  { tags: [CATALOG_TAGS.STOCK, CATALOG_TAGS.PRODUCTS] },
);
