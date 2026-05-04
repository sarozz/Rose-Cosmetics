import { Suspense } from "react";
import Link from "next/link";
import { requireRole, REPORT_VIEW_ROLES } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { SalesSection } from "./sections/sales-section";
import { ProfitSection } from "./sections/profit-section";
import { StaffSection } from "./sections/staff-section";
import { SuppliersSection } from "./sections/suppliers-section";
import { LedgerSection } from "./sections/ledger-section";

export const metadata = { title: "Reports — Rose Cosmetics" };

const SECTION_META: Record<
  Section,
  { label: string; description: string; eyebrow: string }
> = {
  sales: {
    label: "Sales",
    description: "Daily / weekly / monthly trends",
    eyebrow: "Sales",
  },
  profit: {
    label: "Profit & inventory",
    description: "Margins, top SKUs, on-hand value",
    eyebrow: "Profit & inventory",
  },
  staff: {
    label: "Staff",
    description: "Per-cashier monthly performance",
    eyebrow: "Staff performance",
  },
  suppliers: {
    label: "Suppliers",
    description: "Debited, credit, VAT, discount per supplier",
    eyebrow: "Supplier ledger",
  },
  ledger: {
    label: "Inventory ledger",
    description: "Every stock movement, who and when",
    eyebrow: "Inventory ledger",
  },
};

type Section = "sales" | "profit" | "staff" | "suppliers" | "ledger";

function parseSection(raw: string | undefined): Section {
  if (
    raw === "profit" ||
    raw === "staff" ||
    raw === "suppliers" ||
    raw === "ledger"
  ) {
    return raw;
  }
  return "sales";
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    section?: string;
    range?: string;
    month?: string;
    productId?: string;
    supplier?: string;
  }>;
}) {
  await requireRole(REPORT_VIEW_ROLES);
  const params = await searchParams;
  const section = parseSection(params.section);
  const meta = SECTION_META[section];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Reports"
        title={meta.eyebrow}
        description="Switch sections below — every view streams in independently and exports to CSV where it makes sense."
      />

      <ReportSectionNav active={section} />

      <Suspense key={JSON.stringify(params)} fallback={<SectionSkeleton />}>
        {section === "sales" ? (
          <SalesSection range={params.range} />
        ) : section === "profit" ? (
          <ProfitSection />
        ) : section === "staff" ? (
          <StaffSection month={params.month} />
        ) : section === "suppliers" ? (
          <SuppliersSection supplierId={params.supplier} />
        ) : (
          <LedgerSection productId={params.productId} />
        )}
      </Suspense>
    </div>
  );
}

/**
 * Section nav at the top of /reports. All five surfaces (Sales / Profit
 * & inventory / Staff / Suppliers / Ledger) hang off the same route via
 * `?section=`, so navigation is in-place — Next.js streams the new
 * section into the existing shell instead of remounting the page.
 */
function ReportSectionNav({ active }: { active: Section }) {
  const items: Array<{
    slug: Section;
    label: string;
    description: string;
  }> = (Object.entries(SECTION_META) as Array<[Section, (typeof SECTION_META)[Section]]>).map(
    ([slug, m]) => ({
      slug,
      label: m.label,
      description: m.description,
    }),
  );
  return (
    <nav
      aria-label="Reports sections"
      className="no-print grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
    >
      {items.map((it) => {
        const isActive = it.slug === active;
        return (
          <Link
            key={it.slug}
            href={{ pathname: "/reports", query: { section: it.slug } }}
            aria-current={isActive ? "page" : undefined}
            className={`group rounded-xl border p-4 transition-colors ${
              isActive
                ? "border-rose-400/40 bg-rose-500/10"
                : "border-white/10 bg-card hover:border-rose-400/30 hover:bg-card/80"
            }`}
          >
            <div
              className={`text-sm font-semibold ${
                isActive ? "text-rose-200" : "text-ink"
              }`}
            >
              {it.label}
            </div>
            <div className="mt-1 text-xs text-ink-muted">{it.description}</div>
          </Link>
        );
      })}
    </nav>
  );
}

function SectionSkeleton() {
  return (
    <div className="space-y-4" aria-busy>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-xl border border-white/10 bg-card"
          />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-xl border border-white/10 bg-card" />
    </div>
  );
}
