import { notFound } from "next/navigation";
import { requireRole, STAFF_WRITE_ROLES } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { RecipientForm } from "../../recipient-form";
import { updateRecipientAction } from "../../actions";
import type { TelegramFormState } from "../../state";

export const metadata = { title: "Edit Telegram recipient — Rose Cosmetics POS" };

export default async function EditRecipientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(STAFF_WRITE_ROLES);
  const { id } = await params;
  const recipient = await prisma.telegramRecipient.findUnique({ where: { id } });
  if (!recipient) notFound();

  async function boundAction(
    state: TelegramFormState,
    formData: FormData,
  ): Promise<TelegramFormState> {
    "use server";
    return updateRecipientAction(id, state, formData);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Settings · Telegram" title="Edit recipient" />
      <RecipientForm
        action={boundAction}
        submitLabel="Save changes"
        defaults={{
          name: recipient.name,
          chatId: recipient.chatId,
          enabled: recipient.enabled,
          notifySales: recipient.notifySales,
          notifyStockReceipts: recipient.notifyStockReceipts,
        }}
      />
    </div>
  );
}
