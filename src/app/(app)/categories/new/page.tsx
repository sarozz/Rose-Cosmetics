import { CATALOG_WRITE_ROLES, requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { listParentCandidates } from "@/lib/services/category";
import { CategoryForm } from "../category-form";
import { createCategoryAction } from "../actions";

export const metadata = { title: "New category — Rose Cosmetics POS" };

export default async function NewCategoryPage() {
  await requireRole(CATALOG_WRITE_ROLES);
  const parents = await listParentCandidates();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Catalog · Categories" title="Add category" />
      <CategoryForm
        action={createCategoryAction}
        parents={parents}
        submitLabel="Create category"
      />
    </div>
  );
}
