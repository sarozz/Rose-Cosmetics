import { requireRole, SALES_ROLES } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { OnlineOrderForm } from "../online-form";

export const metadata = { title: "New online order — Rose Cosmetics" };

export default async function NewOnlineOrderPage() {
  await requireRole(SALES_ROLES);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Sales · Online"
        title="New online order"
        description="Scan products, fill in the customer's details, then confirm. Stock decrements immediately so the cashier downstairs sees it too."
      />
      <OnlineOrderForm />
    </div>
  );
}
