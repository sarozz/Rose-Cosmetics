import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Client = PrismaClient | Prisma.TransactionClient;

/**
 * Write a row to `audit_logs`. Every catalog mutation calls this so the
 * operator + action + diff are traceable (blueprint rule #4).
 */
export async function writeAuditLog(
  client: Client,
  input: {
    actorUserId: string;
    entityType: string;
    entityId: string;
    action: "CREATE" | "UPDATE" | "DELETE" | "ACTIVATE" | "DEACTIVATE";
    before?: unknown;
    after?: unknown;
  },
) {
  await client.auditLog.create({
    data: {
      actorUserId: input.actorUserId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      beforeJson:
        input.before === undefined
          ? undefined
          : (input.before as Prisma.InputJsonValue),
      afterJson:
        input.after === undefined
          ? undefined
          : (input.after as Prisma.InputJsonValue),
    },
  });
}

export const AUDIT_ENTITY_TYPES = [
  "category",
  "product",
  "purchase",
  "return",
  "sale",
  "shift_close",
  "supplier",
  "user",
] as const;

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

/**
 * Recent audit rows, optionally filtered by entity type or actor. Used on the
 * OWNER-only audit viewer. Defaults to the most recent 200 rows; pagination is
 * by offset because rows are append-only so offset-based paging is stable.
 */
export async function recentAuditLogs(params?: {
  entityType?: string;
  actorUserId?: string;
  limit?: number;
  offset?: number;
}) {
  return prisma.auditLog.findMany({
    where: {
      entityType: params?.entityType || undefined,
      actorUserId: params?.actorUserId || undefined,
    },
    orderBy: { createdAt: "desc" },
    include: {
      actor: { select: { id: true, displayName: true, email: true } },
    },
    take: params?.limit ?? 200,
    skip: params?.offset ?? 0,
  });
}
