import { revalidateTag, unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "./audit";
import type { ProductData } from "@/lib/validation/product";
import { REPORT_TAGS } from "./report";
import { CATALOG_TAGS } from "./cache-tags";

/**
 * Catalog list — wrapped in `unstable_cache` so the page render is served
 * from the data cache after the first hit. Mutations below call
 * `revalidateTag(CATALOG_TAGS.PRODUCTS)` and stock-changing flows
 * (sale, receiving, return) call `CATALOG_TAGS.STOCK` so the on-hand
 * column doesn't go stale.
 */
export const listProducts = unstable_cache(
  async (params?: { query?: string }) => {
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
  },
  ["catalog:listProducts"],
  { tags: [CATALOG_TAGS.PRODUCTS, CATALOG_TAGS.STOCK] },
);

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
  revalidateTag(CATALOG_TAGS.PRODUCTS);
  revalidateTag(CATALOG_TAGS.STOCK);
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
  revalidateTag(CATALOG_TAGS.PRODUCTS);
  revalidateTag(CATALOG_TAGS.STOCK);
  return after;
}

export class ProductDeleteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductDeleteError";
  }
}

/**
 * Hard cascade delete. Wipes every row that references this product —
 * ReturnItem, SaleItem, PurchaseItem, InventoryMovement — then the
 * product itself, all in one transaction. Used by the operator to wipe
 * test data; for real production cleanup the deactivate-via-edit path
 * is still available and preserves the audit trail.
 */
export async function deleteProduct(actorUserId: string, id: string) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new ProductDeleteError("Product not found");

  await prisma.$transaction(async (tx) => {
    await writeAuditLog(tx, {
      actorUserId,
      entityType: "product",
      entityId: id,
      action: "DELETE",
      before: product,
    });
    // Order matters — Prisma defaults to RESTRICT on these FKs.
    // ReturnItem -> SaleItem (must clear refunds before items)
    await tx.returnItem.deleteMany({
      where: { saleItem: { productId: id } },
    });
    await tx.saleItem.deleteMany({ where: { productId: id } });
    await tx.purchaseItem.deleteMany({ where: { productId: id } });
    await tx.inventoryMovement.deleteMany({ where: { productId: id } });
    await tx.product.delete({ where: { id } });
  });

  revalidateTag(REPORT_TAGS.stock);
  revalidateTag(REPORT_TAGS.sales);
  revalidateTag(CATALOG_TAGS.PRODUCTS);
  revalidateTag(CATALOG_TAGS.STOCK);
}
