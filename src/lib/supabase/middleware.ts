import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicEnv } from "@/lib/env";

// Paths that don't require an authenticated session. Anything not in this
// list — and not the public marketing site — gets bounced to /gulabshop.
const PUBLIC_PATHS = [
  "/gulabshop", // staff login (renamed from /login)
  "/track", // public customer order-tracking page
  "/api/telegram/webhook", // Telegram webhook is auth'd by secret, not cookie
];

// Customer-facing marketing pages — fully public, never gated even if the
// user is logged in. The list is small because the marketing site has a
// flat structure (no /shop/x deep routes).
const MARKETING_PATHS = new Set(["/", "/about", "/contact", "/shop"]);

function isPublicPath(pathname: string): boolean {
  if (MARKETING_PATHS.has(pathname)) return true;
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * Cheap check for "the browser is carrying a Supabase auth cookie of any
 * kind". Real validation (signature, expiry, user lookup) happens in the
 * Server Component via `requireUser`. This is used to skip the Supabase
 * network round-trip for anonymous visitors — a big win on cold starts.
 */
function hasAuthCookie(request: NextRequest): boolean {
  for (const c of request.cookies.getAll()) {
    if (c.name.startsWith("sb-") && c.name.includes("auth-token")) return true;
  }
  return false;
}

/**
 * Refreshes the Supabase session cookie on every request and gates
 * private routes:
 *   - Marketing pages (/, /about, /contact, /shop) and the tracking page
 *     stay public regardless of login state.
 *   - Unauthenticated visitors to anything else are bounced to
 *     /gulabshop (the staff login).
 *   - Authenticated staff on /gulabshop are bounced to /dashboard.
 */
export async function updateSupabaseSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = isPublicPath(pathname);

  if (!hasAuthCookie(request)) {
    if (!isPublic) {
      const url = request.nextUrl.clone();
      url.pathname = "/gulabshop";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const env = getPublicEnv();

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options?: CookieOptions }[],
        ) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/gulabshop";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/gulabshop") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
