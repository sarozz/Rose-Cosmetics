import { CATALOG_WRITE_ROLES, requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { listParentCandidates } from "@/lib/services/category";
import { ProductForm } from "../product-form";
import { createProductAction } from "../actions";

export const metadata = { title: "New product — Rose Cosmetics POS" };

export default async function NewProductPage() {
  await requireRole(CATALOG_WRITE_ROLES);
  const categories = await listParentCandidates();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Catalog · Products" title="Add product" />
      <ProductForm
        action={createProductAction}
        categories={categories}
        submitLabel="Create product"
      />
    </div>
  );
}
