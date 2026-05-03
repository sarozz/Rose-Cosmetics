import { revalidateTag, unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "./audit";
import type { CategoryData } from "@/lib/validation/category";
import { CATALOG_TAGS } from "./cache-tags";

export const listCategories = unstable_cache(
  async () => {
    return prisma.category.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      include: { parent: { select: { id: true, name: true } } },
    });
  },
  ["catalog:listCategories"],
  { tags: [CATALOG_TAGS.CATEGORIES] },
);

export async function getCategory(id: string) {
  return prisma.category.findUnique({ where: { id } });
}

/**
 * Categories allowed as a parent when creating/editing `excludeId`. A category
 * cannot be its own parent, nor any of its descendants (which would form a
 * cycle). We compute descendants with a small in-memory traversal — the tree
 * is shallow in practice for a cosmetics catalog.
 */
export const listParentCandidates = unstable_cache(
  async (excludeId?: string) => {
    const all = await prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true, parentId: true },
      orderBy: { name: "asc" },
    });
    if (!excludeId) return all.map(({ id, name }) => ({ id, name }));

    const children = new Map<string, string[]>();
    for (const c of all) {
      if (c.parentId) {
        const list = children.get(c.parentId) ?? [];
        list.push(c.id);
        children.set(c.parentId, list);
      }
    }
    const banned = new Set<string>([excludeId]);
    const stack = [excludeId];
    while (stack.length) {
      const id = stack.pop()!;
      for (const child of children.get(id) ?? []) {
        if (!banned.has(child)) {
          banned.add(child);
          stack.push(child);
        }
      }
    }
    return all
      .filter((c) => !banned.has(c.id))
      .map(({ id, name }) => ({ id, name }));
  },
  ["catalog:listParentCandidates"],
  { tags: [CATALOG_TAGS.CATEGORIES] },
);

export async function createCategory(
  actorUserId: string,
  data: CategoryData,
) {
  const category = await prisma.$transaction(async (tx) => {
    const created = await tx.category.create({ data });
    await writeAuditLog(tx, {
      actorUserId,
      entityType: "category",
      entityId: created.id,
      action: "CREATE",
      after: created,
    });
    return created;
  });
  revalidateTag(CATALOG_TAGS.CATEGORIES);
  return category;
}

export async function updateCategory(
  actorUserId: string,
  id: string,
  data: CategoryData,
) {
  const after = await prisma.$transaction(async (tx) => {
    const before = await tx.category.findUnique({ where: { id } });
    if (!before) throw new Error("Category not found");
    const updated = await tx.category.update({ where: { id }, data });
    await writeAuditLog(tx, {
      actorUserId,
      entityType: "category",
      entityId: id,
      action: before.isActive === updated.isActive ? "UPDATE" : updated.isActive ? "ACTIVATE" : "DEACTIVATE",
      before,
      after: updated,
    });
    return updated;
  });
  revalidateTag(CATALOG_TAGS.CATEGORIES);
  // Listed alongside categories on /products → cached value shows category
  // names that may have been renamed.
  revalidateTag(CATALOG_TAGS.PRODUCTS);
  return after;
}

export class CategoryDeleteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CategoryDeleteError";
  }
}

/**
 * Hard cascade delete. Detaches every product that's tagged with this
 * category (sets categoryId = null) and orphans direct sub-categories
 * (parentId = null) so they survive as top-level entries — then drops
 * the row. Used to wipe test data; preserves the catalog rows.
 */
export async function deleteCategory(actorUserId: string, id: string) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw new CategoryDeleteError("Category not found");

  await prisma.$transaction(async (tx) => {
    await writeAuditLog(tx, {
      actorUserId,
      entityType: "category",
      entityId: id,
      action: "DELETE",
      before: category,
    });
    await tx.product.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    });
    await tx.category.updateMany({
      where: { parentId: id },
      data: { parentId: null },
    });
    await tx.category.delete({ where: { id } });
  });

  revalidateTag(CATALOG_TAGS.CATEGORIES);
  revalidateTag(CATALOG_TAGS.PRODUCTS);
}
