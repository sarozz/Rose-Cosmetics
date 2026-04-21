import {
  CATALOG_WRITE_ROLES,
  INVENTORY_WRITE_ROLES,
  hasRole,
  requireRole,
} from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { ReceivingForm } from "../receiving-form";
import { createPurchaseAction } from "../actions";

export const metadata = { title: "Record receipt — Rose Cosmetics POS" };

export default async function NewReceiptPage() {
  const actor = await requireRole(INVENTORY_WRITE_ROLES);
  const canCreateProducts = hasRole(actor, CATALOG_WRITE_ROLES);

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

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow="Inventory · Receiving" title="Record receipt" />
      {suppliers.length === 0 || products.length === 0 ? (
        <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          {suppliers.length === 0 && products.length === 0
            ? "Add at least one supplier and one product before recording receipts."
            : suppliers.length === 0
              ? "Add a supplier before recording receipts."
              : "Add a product before recording receipts."}
        </div>
      ) : (
        <ReceivingForm
          action={createPurchaseAction}
          suppliers={suppliers}
          products={productOptions}
          canCreateProducts={canCreateProducts}
        />
      )}
    </div>
  );
}
