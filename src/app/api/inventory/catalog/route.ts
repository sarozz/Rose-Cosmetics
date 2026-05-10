import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { listCatalogForSearch } from "@/lib/services/inventory";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Slim catalog snapshot for the inventory-search autocomplete. The browser
 * fetches once, filters locally on every keystroke. Cache headers let the
 * browser reuse the response for 60s — fresh enough that newly-added
 * products show up quickly, sparse enough that typing doesn't re-hit
 * the network.
 */
export async function GET() {
  await requireUser();
  const items = await listCatalogForSearch();
  return NextResponse.json(
    { items },
    {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=120",
      },
    },
  );
}
