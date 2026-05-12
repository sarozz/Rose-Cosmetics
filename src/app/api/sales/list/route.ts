import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { listSalesForTable } from "@/lib/services/sale";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Slim recent-sales list for the /sales table. Browser fetches once and
 * filters in memory. Cached for 30s in the browser — sales don't move
 * fast enough for that to feel stale, and it stops every keystroke
 * from re-hitting the network.
 */
export async function GET() {
  await requireUser();
  const items = await listSalesForTable();
  return NextResponse.json(
    { items },
    {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
      },
    },
  );
}
