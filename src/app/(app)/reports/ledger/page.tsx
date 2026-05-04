import type { Route } from "next";
import { redirect } from "next/navigation";

export default async function LedgerRedirect({
  searchParams,
}: {
  searchParams: Promise<{ productId?: string }>;
}) {
  const { productId } = await searchParams;
  const target = productId
    ? (`/reports?section=ledger&productId=${encodeURIComponent(productId)}` as Route)
    : ("/reports?section=ledger" as Route);
  redirect(target);
}
