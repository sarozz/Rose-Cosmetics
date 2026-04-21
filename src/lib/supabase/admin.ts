import { createClient } from "@supabase/supabase-js";
import { getPublicEnv, getServerEnv } from "@/lib/env";

/**
 * Admin client that uses the service role key — never expose to the browser.
 * Only reachable from server actions / route handlers. Bypasses RLS, so
 * treat every call site as a trust boundary.
 */
export function createSupabaseAdminClient() {
  const pub = getPublicEnv();
  const srv = getServerEnv();
  if (!srv.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Staff provisioning requires it.",
    );
  }
  return createClient(pub.NEXT_PUBLIC_SUPABASE_URL, srv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
