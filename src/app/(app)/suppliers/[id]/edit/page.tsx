import { notFound } from "next/navigation";
import { CATALOG_WRITE_ROLES, requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { getSupplier } from "@/lib/services/supplier";
import { SupplierForm } from "../../supplier-form";
import { updateSupplierAction } from "../../actions";

export const metadata = { title: "Edit supplier — Rose Cosmetics POS" };

export default async function EditSupplierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(CATALOG_WRITE_ROLES);
  const { id } = await params;
  const supplier = await getSupplier(id);
  if (!supplier) notFound();

  const action = updateSupplierAction.bind(null, id);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Catalog · Suppliers"
        title={`Edit ${supplier.name}`}
      />
      <SupplierForm
        action={action}
        defaults={supplier}
        submitLabel="Save changes"
      />
    </div>
  );
}
