import { notFound } from "next/navigation";
import { CATALOG_WRITE_ROLES, requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { getProduct } from "@/lib/services/product";
import { listParentCandidates } from "@/lib/services/category";
import { ProductForm } from "../../product-form";
import { updateProductAction } from "../../actions";

export const metadata = { title: "Edit product — Rose Cosmetics POS" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(CATALOG_WRITE_ROLES);
  const { id } = await params;
  const [product, categories] = await Promise.all([
    getProduct(id),
    listParentCandidates(),
  ]);
  if (!product) notFound();

  const action = updateProductAction.bind(null, id);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Catalog · Products"
        title={`Edit ${product.name}`}
      />
      <ProductForm
        action={action}
        categories={categories}
        defaults={product}
        submitLabel="Save changes"
      />
    </div>
  );
}
