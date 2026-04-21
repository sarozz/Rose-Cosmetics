import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "./audit";
import type { ProductData } from "@/lib/validation/product";
import { REPORT_TAGS } from "./report";

export async function listProducts(params?: { query?: string }) {
  const query = params?.query?.trim();
  return prisma.product.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { brand: { contains: query, mode: "insensitive" } },
            { barcode: { contains: query } },
            { sku: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: { category: { select: { id: true, name: true } } },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    take: 200,
  });
}

export async function getProduct(id: string) {
  return prisma.product.findUnique({ where: { id } });
}

export async function createProduct(
  actorUserId: string,
  data: ProductData,
) {
  const product = await prisma.$transaction(async (tx) => {
    const created = await tx.product.create({ data });
    await writeAuditLog(tx, {
      actorUserId,
      entityType: "product",
      entityId: created.id,
      action: "CREATE",
      after: created,
    });
    return created;
  });
  // New product may have a reorderLevel and currentStock, so it can appear in
  // the low-stock list immediately.
  revalidateTag(REPORT_TAGS.stock);
  return product;
}

export async function updateProduct(
  actorUserId: string,
  id: string,
  data: ProductData,
) {
  const after = await prisma.$transaction(async (tx) => {
    const before = await tx.product.findUnique({ where: { id } });
    if (!before) throw new Error("Product not found");
    const updated = await tx.product.update({ where: { id }, data });
    await writeAuditLog(tx, {
      actorUserId,
      entityType: "product",
      entityId: id,
      action: before.isActive === updated.isActive ? "UPDATE" : updated.isActive ? "ACTIVATE" : "DEACTIVATE",
      before,
      after: updated,
    });
    return updated;
  });
  // reorderLevel / isActive / currentStock edits all change what the
  // low-stock report shows.
  revalidateTag(REPORT_TAGS.stock);
  return after;
}
