import type { Route } from "next";
import { redirect } from "next/navigation";

export default async function StaffReportRedirect({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const target = month
    ? (`/reports?section=staff&month=${encodeURIComponent(month)}` as Route)
    : ("/reports?section=staff" as Route);
  redirect(target);
}
