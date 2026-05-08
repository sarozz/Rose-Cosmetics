import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  chatMessagesSince,
  chatReadsForMessages,
} from "@/lib/services/chat";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Polling fallback: returns messages strictly after `?since=<iso>` plus the
 * latest read receipts for `?ids=a,b,c`. Hit every ~10s by the dock so we
 * stay correct even when Supabase Realtime is misconfigured.
 */
export async function GET(req: NextRequest) {
  await requireUser();
  const url = new URL(req.url);
  const since = url.searchParams.get("since");
  const idsRaw = url.searchParams.get("ids") ?? "";
  const ids = idsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 200);

  const [messages, reads] = await Promise.all([
    since ? chatMessagesSince(since) : Promise.resolve([]),
    chatReadsForMessages(ids),
  ]);

  return NextResponse.json({ messages, reads });
}
