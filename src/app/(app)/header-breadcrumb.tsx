"use client";

import { usePathname } from "next/navigation";

const SECTION_LABEL: Record<string, string> = {
  dashboard: "Dashboard",
  inventory: "Inventory",
  products: "Products",
  categories: "Categories",
  suppliers: "Suppliers",
  receiving: "Receiving",
  pos: "Point of Sale",
  close: "Day close",
  returns: "Returns",
  reports: "Reports",
  staff: "Staff",
  settings: "Settings",
  audit: "Audit",
};

/**
 * Renders the active section label in the app header. Replaces the old
 * static "Point of sale" line that didn't reflect where the user actually
 * was. Reads the first path segment because nested routes (e.g.
 * /products/new, /reports/profit) belong to the same parent section.
 */
export function HeaderBreadcrumb() {
  const pathname = usePathname() ?? "";
  const top = pathname.split("/").filter(Boolean)[0] ?? "";
  const label = SECTION_LABEL[top];
  if (!label) return null;
  return (
    <div className="hidden items-center gap-2 md:flex">
      <span className="h-1.5 w-1.5 rounded-full bg-rose-400" aria-hidden />
      <span className="text-sm font-medium text-ink">{label}</span>
    </div>
  );
}
