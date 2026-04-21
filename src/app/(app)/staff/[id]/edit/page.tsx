import { notFound } from "next/navigation";
import { requireRole, STAFF_WRITE_ROLES } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { getStaff } from "@/lib/services/user";
import { StaffForm } from "../../staff-form";
import { updateStaffAction } from "../../actions";

export const metadata = { title: "Edit staff — Rose Cosmetics" };

export default async function EditStaffPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireRole(STAFF_WRITE_ROLES);
  const { id } = await params;
  const staff = await getStaff(id);
  if (!staff) notFound();

  const action = updateStaffAction.bind(null, id);
  const selfEdit = staff.id === actor.id;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Administration · Staff"
        title={`Edit ${staff.displayName}`}
      />
      <StaffForm
        action={action}
        mode="update"
        defaults={{
          email: staff.email,
          displayName: staff.displayName,
          role: staff.role,
          isActive: staff.isActive,
        }}
        submitLabel="Save changes"
        selfEdit={selfEdit}
      />
    </div>
  );
}
