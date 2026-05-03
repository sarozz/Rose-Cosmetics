import { revalidateTag, unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "./audit";
import type { SupplierData } from "@/lib/validation/supplier";
import { REPORT_TAGS } from "./report";
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
 * Hard cascade delete. Wipes every purchase by this supplier (and the
 * inventory movements those purchases wrote — PurchaseItem cascades on
 * the FK), then the supplier. Stock snapshots are *not* reversed: this
 * is for clearing out test data, not for unwinding a real receipt. If
 * the operator wants to keep history they should deactivate via Edit
 * instead.
 */
export async function deleteSupplier(actorUserId: string, id: string) {
  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) throw new SupplierDeleteError("Supplier not found");

  await prisma.$transaction(async (tx) => {
    await writeAuditLog(tx, {
      actorUserId,
      entityType: "supplier",
      entityId: id,
      action: "DELETE",
      before: supplier,
    });

    const purchases = await tx.purchase.findMany({
      where: { supplierId: id },
      select: { id: true },
    });
    const purchaseIds = purchases.map((p) => p.id);
    if (purchaseIds.length > 0) {
      await tx.inventoryMovement.deleteMany({
        where: { sourceTable: "purchases", sourceId: { in: purchaseIds } },
      });
      // PurchaseItem.purchaseId has onDelete: Cascade in the schema, so
      // deleting Purchase removes the line rows automatically.
      await tx.purchase.deleteMany({ where: { id: { in: purchaseIds } } });
    }
    await tx.supplier.delete({ where: { id } });
  });

  revalidateTag(CATALOG_TAGS.SUPPLIERS);
  revalidateTag(REPORT_TAGS.stock);
  revalidateTag(CATALOG_TAGS.STOCK);
}
