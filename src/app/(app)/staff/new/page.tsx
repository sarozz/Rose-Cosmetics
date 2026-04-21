import { requireRole, STAFF_WRITE_ROLES } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { StaffForm } from "../staff-form";
import { createStaffAction } from "../actions";

export const metadata = { title: "Add staff — Rose Cosmetics" };

export default async function NewStaffPage() {
  await requireRole(STAFF_WRITE_ROLES);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Administration · Staff"
        title="Add staff member"
        description="Pre-provision the row; the person signs in with Supabase Auth using this email to link the account."
      />
      <StaffForm
        action={createStaffAction}
        mode="create"
        submitLabel="Add staff member"
      />
    </div>
  );
}
