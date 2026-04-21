import { cache } from "react";
import { revalidateTag, unstable_cache } from "next/cache";
import { redirect } from "next/navigation";
import type { User as PrismaUser, UserRole } from "@prisma/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export type AuthenticatedUser = PrismaUser;

/**
 * Role groups used across the app. Centralized here so sidebar visibility,
 * server actions, and server components stay in sync.
 */
export const CATALOG_WRITE_ROLES: UserRole[] = ["OWNER", "MANAGER"];
export const STAFF_WRITE_ROLES: UserRole[] = ["OWNER"];
export const INVENTORY_WRITE_ROLES: UserRole[] = ["OWNER", "MANAGER", "INVENTORY"];
export const SALES_ROLES: UserRole[] = ["OWNER", "MANAGER", "CASHIER"];
export const RETURN_WRITE_ROLES: UserRole[] = ["OWNER", "MANAGER"];
export const REPORT_VIEW_ROLES: UserRole[] = ["OWNER", "MANAGER"];
export const AUDIT_VIEW_ROLES: UserRole[] = ["OWNER"];

/**
 * Cache tag used to flush the Prisma user lookup across requests when staff
 * rows change (role, isActive, authId link, etc.). Mutation services call
 * `revalidateTag(AUTH_USER_TAG)` to drop the cache.
 */
export const AUTH_USER_TAG = "auth:user";
const USER_CACHE_TTL_SECONDS = 60;

/**
 * Prisma user lookup keyed by Supabase authId, cached across requests. The
 * common case on every authenticated page load is "same user as a moment ago"
 * — fetching that row from Supabase 2+ times a minute was a measurable
 * contributor to TTFB. Invalidated via `AUTH_USER_TAG` on staff edits.
 */
const userByAuthIdCached = unstable_cache(
  async (authId: string) => {
    return prisma.user.findUnique({ where: { authId } });
  },
  ["auth:userByAuthId"],
  { revalidate: USER_CACHE_TTL_SECONDS, tags: [AUTH_USER_TAG] },
);

/**
 * Resolve the current Supabase session to a Prisma `User` row. On first login,
 * links the Supabase `authId` to a pre-seeded staff row matched by email
 * (case-insensitive). Users must be pre-provisioned by an OWNER — we never
 * auto-create rows from a Supabase sign-in.
 *
 * Uses `getSession()` rather than `getUser()` because the middleware has
 * already validated the JWT over the wire for this request. `getSession()`
 * reads the signed cookie locally — zero network — saving ~100–400ms of
 * Supabase round-trip on every page.
 *
 * Wrapped in React `cache()` so multiple server components in the same render
 * (layout + page + nested components calling `requireUser` / `requireRole`)
 * share one Supabase auth lookup and one Prisma user fetch instead of N.
 */
export const getCurrentUser = cache(
  async (): Promise<AuthenticatedUser | null> => {
    const supabase = await createSupabaseServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const authId = session.user.id;
    const email = session.user.email?.toLowerCase();

    const byAuthId = await userByAuthIdCached(authId);
    if (byAuthId) return byAuthId.isActive ? byAuthId : null;

    if (!email) return null;

    const byEmail = await prisma.user.findUnique({ where: { email } });
    if (!byEmail || !byEmail.isActive) return null;

    const linked = await prisma.user.update({
      where: { id: byEmail.id },
      data: { authId },
    });
    // The `userByAuthIdCached` entry for this authId just returned null; flush
    // it so subsequent requests hit the cache rather than re-running the
    // email fallback for the next 60s.
    revalidateTag(AUTH_USER_TAG);
    return linked;
  },
);

/**
 * Enforce an authenticated session inside a Server Component or Server Action.
 * Redirects to `/login` when unauthenticated or unprovisioned.
 */
export async function requireUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export function hasRole(user: AuthenticatedUser, allowed: UserRole[]): boolean {
  return allowed.includes(user.role);
}

/**
 * Enforce that the current user holds one of the allowed roles. Redirects
 * forbidden users to `/dashboard` rather than throwing — the UI should avoid
 * presenting links they can't use, so this is a defense-in-depth check.
 */
export async function requireRole(
  allowed: UserRole[],
): Promise<AuthenticatedUser> {
  const user = await requireUser();
  if (!hasRole(user, allowed)) redirect("/dashboard");
  return user;
}
