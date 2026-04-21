import { CATALOG_WRITE_ROLES, requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { SupplierForm } from "../supplier-form";
import { createSupplierAction } from "../actions";

export const metadata = { title: "New supplier — Rose Cosmetics POS" };

export default async function NewSupplierPage() {
  await requireRole(CATALOG_WRITE_ROLES);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Catalog · Suppliers" title="Add supplier" />
      <SupplierForm action={createSupplierAction} submitLabel="Create supplier" />
    </div>
  );
}
