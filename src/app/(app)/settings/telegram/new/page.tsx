import { requireRole, STAFF_WRITE_ROLES } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { RecipientForm } from "../recipient-form";
import { createRecipientAction } from "../actions";

export const metadata = { title: "Add Telegram recipient — Rose Cosmetics POS" };

export default async function NewRecipientPage() {
  await requireRole(STAFF_WRITE_ROLES);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Settings · Telegram" title="Add recipient" />
      <RecipientForm
        action={createRecipientAction}
        submitLabel="Save recipient"
      />
    </div>
  );
}
