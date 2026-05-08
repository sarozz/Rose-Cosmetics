import { notFound } from "next/navigation";
import {
  CATALOG_WRITE_ROLES,
  INVENTORY_WRITE_ROLES,
  hasRole,
  requireRole,
} from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { getPurchase } from "@/lib/services/purchase";
import { ReceivingForm } from "../../receiving-form";
import { updatePurchaseAction } from "../../actions";
import type { ReceivingFormState } from "../../state";

export const metadata = { title: "Edit receipt — Rose Cosmetics POS" };

export default async function EditReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireRole(INVENTORY_WRITE_ROLES);
  const canCreateProducts = hasRole(actor, CATALOG_WRITE_ROLES);
  const { id } = await params;

  const purchase = await getPurchase(id);
  if (!purchase) notFound();

  const [suppliers, products] = await Promise.all([
    prisma.supplier.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        brand: true,
        costPrice: true,
        sellPrice: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const productOptions = products.map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    costPrice: p.costPrice.toString(),
    sellPrice: p.sellPrice.toString(),
  }));

  async function boundAction(
    state: ReceivingFormState,
    formData: FormData,
  ): Promise<ReceivingFormState> {
    "use server";
    return updatePurchaseAction(id, state, formData);
  }

  const defaults = {
    supplierId: purchase.supplierId,
    purchaseDate: purchase.purchaseDate.toISOString().slice(0, 10),
    notes: purchase.notes ?? "",
    debited: purchase.debited.toString(),
    credit: purchase.credit.toString(),
    vat: purchase.vat.toString(),
    discount: purchase.discount.toString(),
    items: purchase.items.map((it) => ({
      productId: it.productId,
      qty: String(it.qty),
      costPrice: it.costPrice.toString(),
      sellPrice: it.sellPrice.toString(),
    })),
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow={`Inventory · Receiving · ${purchase.purchaseRef}`}
        title="Edit receipt"
        description="Saving will roll back this receipt's stock effect and re-apply with the new figures. Negative stock is allowed if some units have already been sold."
      />
      <ReceivingForm
        action={boundAction}
        suppliers={suppliers}
        products={productOptions}
        canCreateProducts={canCreateProducts}
        defaults={defaults}
        submitLabel="Save changes"
        pendingLabel="Saving…"
      />
    </div>
  );
}
