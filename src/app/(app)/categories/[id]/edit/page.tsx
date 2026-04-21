import { notFound } from "next/navigation";
import { CATALOG_WRITE_ROLES, requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { getCategory, listParentCandidates } from "@/lib/services/category";
import { CategoryForm } from "../../category-form";
import { updateCategoryAction } from "../../actions";

export const metadata = { title: "Edit category — Rose Cosmetics POS" };

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(CATALOG_WRITE_ROLES);
  const { id } = await params;
  const [category, parents] = await Promise.all([
    getCategory(id),
    listParentCandidates(id),
  ]);
  if (!category) notFound();

  const action = updateCategoryAction.bind(null, id);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Catalog · Categories"
        title={`Edit ${category.name}`}
      />
      <CategoryForm
        action={action}
        parents={parents}
        defaults={category}
        submitLabel="Save changes"
      />
    </div>
  );
}
