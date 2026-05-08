import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { bootstrapChat } from "@/lib/services/chat";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Initial chat payload — members + recent messages + last-read timestamp.
 * Called from the dock on mount, after hydration. Keeps the heavy bootstrap
 * off the layout's render path so navigation feels instant even when the
 * chat tables are slow.
 */
export async function GET() {
  const user = await requireUser();
  const data = await bootstrapChat(user.id);
  return NextResponse.json({ currentUserId: user.id, ...data });
}
