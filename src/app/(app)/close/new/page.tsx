import { SALES_ROLES, requireRole } from "@/lib/auth";
import { previewClose } from "@/lib/services/close";
import { PageHeader } from "@/components/page-header";
import { CloseForm } from "../close-form";

export const metadata = { title: "New day close — Rose Cosmetics POS" };

export default async function NewClosePage() {
  await requireRole(SALES_ROLES);
  const preview = await previewClose();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Sales · Day close"
        title="Count the till"
        description="Enter the float you started with and the cash you just counted. Expected cash is computed from the period's CASH sales minus cash refunds."
      />
      <CloseForm preview={preview} />
    </div>
  );
}
