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
  return prisma.product.findUnique({
    where: { id },
    include: { extraBarcodes: { orderBy: { createdAt: "asc" } } },
  });
}

export type ProductTableEntry = {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  sellPrice: string;
  currentStock: number;
  reorderLevel: number;
  isActive: boolean;
  category: string | null;
  /** Lowercased haystack pre-baked on the server: name + brand + sku +
   *  primary barcode + every extra barcode. The client filter calls
   *  `.includes(query)` on this — sub-millisecond per row. */
  search: string;
};

/**
 * Slim product list for the /products table. Returns ALL products (active
 * + inactive — operators need to see what they've deactivated). Pre-bakes
 * a lowercased search haystack including alternate barcodes so the
 * client filter doesn't redo the work on every keystroke.
 */
export async function listProductsForTable(): Promise<ProductTableEntry[]> {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      brand: true,
      barcode: true,
      sku: true,
      sellPrice: true,
      currentStock: true,
      reorderLevel: true,
      isActive: true,
      category: { select: { name: true } },
      extraBarcodes: { select: { code: true } },
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    take: 1000,
  });
  return products.map((p) => {
    const haystackBits = [
      p.name,
      p.brand ?? "",
      p.sku ?? "",
      p.barcode ?? "",
      ...p.extraBarcodes.map((b) => b.code),
      p.category?.name ?? "",
    ];
    return {
      id: p.id,
      name: p.name,
      brand: p.brand,
      barcode: p.barcode,
      sellPrice: p.sellPrice.toFixed(2),
      currentStock: p.currentStock,
      reorderLevel: p.reorderLevel,
      isActive: p.isActive,
      category: p.category?.name ?? null,
      search: haystackBits.join("  ").toLowerCase(),
    };
  });
}

export async function createProduct(
  actorUserId: string,
  data: ProductData,
) {
  const { extraBarcodes, ...rest } = data;
  const product = await prisma.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: {
        ...rest,
        extraBarcodes: extraBarcodes.length
          ? {
              create: extraBarcodes.map((b) => ({
                code: b.code,
                label: b.label,
              })),
            }
          : undefined,
      },
      include: { extraBarcodes: true },
    });
    await writeAuditLog(tx, {
      actorUserId,
      entityType: "product",
      entityId: created.id,
      action: "CREATE",
      after: created,
    });
    return created;
  });
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
  const { extraBarcodes, ...rest } = data;
  const after = await prisma.$transaction(async (tx) => {
    const before = await tx.product.findUnique({
      where: { id },
      include: { extraBarcodes: true },
    });
    if (!before) throw new Error("Product not found");
    // Simple reconcile: wipe + reinsert. The list is small (a handful at
    // most) so an in-place diff isn't worth the complexity, and the unique
    // constraint on `code` means the row identities don't matter to other
    // tables.
    await tx.productBarcode.deleteMany({ where: { productId: id } });
    const updated = await tx.product.update({
      where: { id },
      data: {
        ...rest,
        extraBarcodes: extraBarcodes.length
          ? {
              create: extraBarcodes.map((b) => ({
                code: b.code,
                label: b.label,
              })),
            }
          : undefined,
      },
      include: { extraBarcodes: true },
    });
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
