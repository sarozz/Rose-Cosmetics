import { revalidateTag, unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "./audit";
import type { SupplierData } from "@/lib/validation/supplier";
import { CATALOG_TAGS } from "./cache-tags";

export const listSuppliers = unstable_cache(
  async (params?: { query?: string }) => {
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
  },
  ["catalog:listSuppliers"],
  { tags: [CATALOG_TAGS.SUPPLIERS] },
);

export async function getSupplier(id: string) {
  return prisma.supplier.findUnique({ where: { id } });
}

export async function createSupplier(
  actorUserId: string,
  data: SupplierData,
) {
  const supplier = await prisma.$transaction(async (tx) => {
    const created = await tx.supplier.create({ data });
    await writeAuditLog(tx, {
      actorUserId,
      entityType: "supplier",
      entityId: created.id,
      action: "CREATE",
      after: created,
    });
    return created;
  });
  revalidateTag(CATALOG_TAGS.SUPPLIERS);
  return supplier;
}

export async function updateSupplier(
  actorUserId: string,
  id: string,
  data: SupplierData,
) {
  const after = await prisma.$transaction(async (tx) => {
    const before = await tx.supplier.findUnique({ where: { id } });
    if (!before) throw new Error("Supplier not found");
    const updated = await tx.supplier.update({ where: { id }, data });
    await writeAuditLog(tx, {
      actorUserId,
      entityType: "supplier",
      entityId: id,
      action: before.isActive === updated.isActive ? "UPDATE" : updated.isActive ? "ACTIVATE" : "DEACTIVATE",
      before,
      after: updated,
    });
    return updated;
  });
  revalidateTag(CATALOG_TAGS.SUPPLIERS);
  return after;
}
