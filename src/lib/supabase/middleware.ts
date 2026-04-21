import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicEnv } from "@/lib/env";

const PUBLIC_PATHS = ["/login"];

function isPublicPath(pathname: string): boolean {
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
 * Refreshes the Supabase session cookie on every request and gates private
 * routes: unauthenticated visitors to non-public paths are redirected to
 * `/login`. Authenticated visitors on `/login` are bounced to `/dashboard`.
 *
 * Optimisation: when the browser has no Supabase cookie at all we can't
 * possibly be logged in, so we skip the `getUser()` network call entirely
 * and just redirect (or let `/login` render). That saves ~100-300ms of
 * Supabase round-trip on every cold start for anonymous traffic.
 */
export async function updateSupabaseSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = isPublicPath(pathname);

  if (!hasAuthCookie(request)) {
    if (!isPublic) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
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
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
