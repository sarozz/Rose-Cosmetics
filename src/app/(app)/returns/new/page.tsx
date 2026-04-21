import { requireRole, RETURN_WRITE_ROLES } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { getSaleForReturn } from "@/lib/services/return";
import { ReturnForm } from "../return-form";
import { createReturnAction } from "../actions";

export const metadata = { title: "New return — Rose Cosmetics" };

export default async function NewReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ sale?: string }>;
}) {
  await requireRole(RETURN_WRITE_ROLES);
  const { sale: saleRef } = await searchParams;

  const sale = saleRef ? await getSaleForReturn(saleRef.trim()) : null;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Sales · Returns"
        title="New return"
        description="Look up a completed sale, pick the lines being refunded, and untick 'restock' for damaged units."
      />

      <form method="get" className="mb-6 flex gap-2">
        <input
          name="sale"
          defaultValue={saleRef ?? ""}
          placeholder="Sale reference (e.g. SR-20260421-0001)"
          className="block w-full rounded-md border border-white/10 px-3 py-2 font-mono text-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/30"
          autoComplete="off"
        />
        <button type="submit" className="btn-secondary whitespace-nowrap">
          Look up
        </button>
      </form>

      {!saleRef ? null : !sale ? (
        <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          No sale found with reference{" "}
          <span className="font-mono">{saleRef}</span>.
        </div>
      ) : sale.lines.every((l) => l.refundableQty === 0) ? (
        <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          Every line on <span className="font-mono">{sale.saleRef}</span> has
          already been fully refunded.
        </div>
      ) : (
        <ReturnForm action={createReturnAction} sale={sale} />
      )}
    </div>
  );
}
