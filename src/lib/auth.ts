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
 * Resolve the current Supabase session to a Prisma `User` row. On first login,
 * links the Supabase `authId` to a pre-seeded staff row matched by email
 * (case-insensitive). Users must be pre-provisioned by an OWNER — we never
 * auto-create rows from a Supabase sign-in.
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const authId = data.user.id;
  const email = data.user.email?.toLowerCase();

  const byAuthId = await prisma.user.findUnique({ where: { authId } });
  if (byAuthId) return byAuthId.isActive ? byAuthId : null;

  if (!email) return null;

  const byEmail = await prisma.user.findUnique({ where: { email } });
  if (!byEmail || !byEmail.isActive) return null;

  return prisma.user.update({
    where: { id: byEmail.id },
    data: { authId },
  });
}

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
