import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "./audit";
import type { ProductData } from "@/lib/validation/product";

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
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({ data });
    await writeAuditLog(tx, {
      actorUserId,
      entityType: "product",
      entityId: product.id,
      action: "CREATE",
      after: product,
    });
    return product;
  });
}

export async function updateProduct(
  actorUserId: string,
  id: string,
  data: ProductData,
) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.product.findUnique({ where: { id } });
    if (!before) throw new Error("Product not found");
    const after = await tx.product.update({ where: { id }, data });
    await writeAuditLog(tx, {
      actorUserId,
      entityType: "product",
      entityId: id,
      action: before.isActive === after.isActive ? "UPDATE" : after.isActive ? "ACTIVATE" : "DEACTIVATE",
      before,
      after,
    });
    return after;
  });
}
