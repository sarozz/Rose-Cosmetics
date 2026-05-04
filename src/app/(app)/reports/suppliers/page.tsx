import type { Route } from "next";
import { redirect } from "next/navigation";

export default async function SuppliersReportRedirect({
  searchParams,
}: {
  searchParams: Promise<{ supplier?: string }>;
}) {
  const { supplier } = await searchParams;
  const target = supplier
    ? (`/reports?section=suppliers&supplier=${encodeURIComponent(supplier)}` as Route)
    : ("/reports?section=suppliers" as Route);
  redirect(target);
}
