import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "./audit";
import type { CategoryData } from "@/lib/validation/category";

export async function listCategories() {
  return prisma.category.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: { parent: { select: { id: true, name: true } } },
  });
}

export async function getCategory(id: string) {
  return prisma.category.findUnique({ where: { id } });
}

/**
 * Categories allowed as a parent when creating/editing `excludeId`. A category
 * cannot be its own parent, nor any of its descendants (which would form a
 * cycle). We compute descendants with a small in-memory traversal — the tree
 * is shallow in practice for a cosmetics catalog.
 */
export async function listParentCandidates(excludeId?: string) {
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
}

export async function createCategory(
  actorUserId: string,
  data: CategoryData,
) {
  return prisma.$transaction(async (tx) => {
    const category = await tx.category.create({ data });
    await writeAuditLog(tx, {
      actorUserId,
      entityType: "category",
      entityId: category.id,
      action: "CREATE",
      after: category,
    });
    return category;
  });
}

export async function updateCategory(
  actorUserId: string,
  id: string,
  data: CategoryData,
) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.category.findUnique({ where: { id } });
    if (!before) throw new Error("Category not found");
    const after = await tx.category.update({ where: { id }, data });
    await writeAuditLog(tx, {
      actorUserId,
      entityType: "category",
      entityId: id,
      action: before.isActive === after.isActive ? "UPDATE" : after.isActive ? "ACTIVATE" : "DEACTIVATE",
      before,
      after,
    });
    return after;
  });
}
