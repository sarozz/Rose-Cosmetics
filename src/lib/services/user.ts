import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "./audit";
import type {
  UserCreateData,
  UserUpdateData,
} from "@/lib/validation/user";

export async function listStaff(params?: { query?: string }) {
  const query = params?.query?.trim();
  return prisma.user.findMany({
    where: query
      ? {
          OR: [
            { email: { contains: query, mode: "insensitive" } },
            { displayName: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: [{ isActive: "desc" }, { displayName: "asc" }],
  });
}

export async function getStaff(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export class StaffValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StaffValidationError";
  }
}

export async function createStaff(
  actorUserId: string,
  data: UserCreateData,
) {
  // Pre-check: a duplicate email in our own table should fail fast before we
  // ever touch Supabase Auth, so we don't leave a zombie auth user behind on
  // a unique-constraint rollback.
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existing) {
    throw new StaffValidationError(
      "A staff member with that email already exists.",
    );
  }

  const admin = createSupabaseAdminClient();
  const { data: created, error } = await admin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: { displayName: data.displayName },
  });
  if (error || !created.user) {
    throw new StaffValidationError(
      error?.message ?? "Could not create sign-in account.",
    );
  }
  const authId = created.user.id;

  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          displayName: data.displayName,
          role: data.role,
          authId,
        },
      });
      await writeAuditLog(tx, {
        actorUserId,
        entityType: "user",
        entityId: user.id,
        action: "CREATE",
        after: user,
      });
      return user;
    });
  } catch (err) {
    // Roll back the Supabase auth user so a retry with the same email works.
    // Best-effort: if this cleanup fails we surface the original error.
    await admin.auth.admin.deleteUser(authId).catch(() => undefined);
    throw err;
  }
}

/**
 * Update a staff row with the invariants that keep the shop governable:
 *   - You can't change your own role or deactivate yourself. Otherwise an
 *     OWNER could accidentally lock themselves out of their own system.
 *   - You can't demote or deactivate the last active OWNER. The count is
 *     re-read inside the transaction so two concurrent updates can't both
 *     "see" themselves as the second-to-last OWNER.
 */
export async function updateStaff(
  actorUserId: string,
  id: string,
  data: UserUpdateData,
) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.user.findUnique({ where: { id } });
    if (!before) throw new StaffValidationError("Staff member not found");

    const selfEdit = before.id === actorUserId;
    if (selfEdit && before.role !== data.role) {
      throw new StaffValidationError("You cannot change your own role");
    }
    if (selfEdit && before.isActive && !data.isActive) {
      throw new StaffValidationError("You cannot deactivate yourself");
    }

    const wasOwner = before.role === "OWNER" && before.isActive;
    const stillOwner = data.role === "OWNER" && data.isActive;
    if (wasOwner && !stillOwner) {
      const otherOwners = await tx.user.count({
        where: { role: "OWNER", isActive: true, id: { not: id } },
      });
      if (otherOwners === 0) {
        throw new StaffValidationError(
          "At least one active OWNER must remain",
        );
      }
    }

    const after = await tx.user.update({
      where: { id },
      data: {
        displayName: data.displayName,
        role: data.role,
        isActive: data.isActive,
      },
    });

    await writeAuditLog(tx, {
      actorUserId,
      entityType: "user",
      entityId: id,
      action:
        before.isActive === after.isActive
          ? "UPDATE"
          : after.isActive
            ? "ACTIVATE"
            : "DEACTIVATE",
      before,
      after,
    });

    return after;
  });
}
