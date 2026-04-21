import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "./audit";
import type { SupplierData } from "@/lib/validation/supplier";

export async function listSuppliers(params?: { query?: string }) {
  const query = params?.query?.trim();
  return prisma.supplier.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
}

export async function getSupplier(id: string) {
  return prisma.supplier.findUnique({ where: { id } });
}

export async function createSupplier(
  actorUserId: string,
  data: SupplierData,
) {
  return prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.create({ data });
    await writeAuditLog(tx, {
      actorUserId,
      entityType: "supplier",
      entityId: supplier.id,
      action: "CREATE",
      after: supplier,
    });
    return supplier;
  });
}

export async function updateSupplier(
  actorUserId: string,
  id: string,
  data: SupplierData,
) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.supplier.findUnique({ where: { id } });
    if (!before) throw new Error("Supplier not found");
    const after = await tx.supplier.update({ where: { id }, data });
    await writeAuditLog(tx, {
      actorUserId,
      entityType: "supplier",
      entityId: id,
      action: before.isActive === after.isActive ? "UPDATE" : after.isActive ? "ACTIVATE" : "DEACTIVATE",
      before,
      after,
    });
    return after;
  });
}
