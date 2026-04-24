import { requireRole, SALES_ROLES } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { PosClient } from "./pos-client";
import { OpenCustomerDisplay } from "./open-customer-display";

export const metadata = { title: "POS — Rose Cosmetics" };

export default async function PosPage() {
  await requireRole(SALES_ROLES);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Sales"
        title="Point of sale"
        description="Scan a barcode to add to cart. Cash checkout writes the sale, decrements stock, and logs a ledger movement in one transaction."
        actions={<OpenCustomerDisplay />}
      />
      <PosClient />
    </div>
  );
}
