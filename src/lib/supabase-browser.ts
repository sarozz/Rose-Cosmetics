"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Singleton browser-side Supabase client. We use it only for Realtime —
 * authentication and DB writes still go through our own session cookie +
 * Prisma. The anon key is the public one shipped to the browser by
 * design; INSERTs are gated server-side by Prisma + our auth, and the
 * realtime channel just streams Postgres-level INSERTs that already
 * happened.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  client = createBrowserClient(url, anonKey, {
    realtime: { params: { eventsPerSecond: 5 } },
  });
  return client;
}
