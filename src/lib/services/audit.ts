import type { Prisma, PrismaClient } from "@prisma/client";

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
