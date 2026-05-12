import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { listProductsForTable } from "@/lib/services/product";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Slim product list (id, name, brand, barcode, sellPrice, stock, reorder
 * level, isActive, category, lowercased search haystack including alt
 * barcodes). Browser fetches once and filters in memory on every
 * keystroke. Cached for 30s — products turn over slowly enough that this
 * is plenty fresh, but it stops typing from repeatedly hitting the wire.
 */
export async function GET() {
  await requireUser();
  const items = await listProductsForTable();
  return NextResponse.json(
    { items },
    {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
      },
    },
  );
}
