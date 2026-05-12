import Link from "next/link";
import { CATALOG_WRITE_ROLES, hasRole, requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { ProductsClient } from "./products-client";

export const metadata = { title: "Products — Rose Cosmetics POS" };

export default async function ProductsPage() {
  const user = await requireUser();
  const canWrite = hasRole(user, CATALOG_WRITE_ROLES);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Catalog"
        title="Products"
        description="Everything the store sells — scanned by barcode at the till. On-hand stock refreshes after every sale and receipt."
        actions={
          canWrite ? (
            <Link href="/products/new" className="btn-primary">
              Add product
            </Link>
          ) : null
        }
      />
      <ProductsClient canWrite={canWrite} />
    </div>
  );
}
