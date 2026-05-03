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

export class SupplierDeleteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupplierDeleteError";
  }
}

/**
 * Hard-delete a supplier. Refuses when there's purchase history on file
 * — that's the FK relationship we'd otherwise orphan. Deactivate instead.
 */
export async function deleteSupplier(actorUserId: string, id: string) {
  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) throw new SupplierDeleteError("Supplier not found");

  const purchases = await prisma.purchase.count({ where: { supplierId: id } });
  if (purchases > 0) {
    throw new SupplierDeleteError(
      `This supplier has ${purchases} purchase${
        purchases === 1 ? "" : "s"
      } on file. Deactivate via Edit instead so the receipts stay attributable.`,
    );
  }

  await prisma.$transaction(async (tx) => {
    await writeAuditLog(tx, {
      actorUserId,
      entityType: "supplier",
      entityId: id,
      action: "DELETE",
      before: supplier,
    });
    await tx.supplier.delete({ where: { id } });
  });

  revalidateTag(CATALOG_TAGS.SUPPLIERS);
}
