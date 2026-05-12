import { requireRole, SALES_ROLES, RETURN_WRITE_ROLES, hasRole } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { SalesClient } from "./sales-client";

export const metadata = { title: "Sales — Rose Cosmetics" };

export default async function SalesPage() {
  const user = await requireRole(SALES_ROLES);
  const canRefund = hasRole(user, RETURN_WRITE_ROLES);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader
        eyebrow="Sales"
        title="Sales history"
        description="Every completed sale, newest first. Search by SR or cashier — filtering is instant."
      />
      <SalesClient canRefund={canRefund} />
    </div>
  );
}
