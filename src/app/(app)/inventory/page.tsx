import { requireUser } from "@/lib/auth";
import { inventorySnapshot } from "@/lib/services/inventory";
import type {
  InventoryCategory,
  InventoryProduct,
} from "@/lib/services/inventory";
import { PageHeader } from "@/components/page-header";
import { InventorySearch } from "./inventory-search";

export const metadata = { title: "Inventory — Rose Cosmetics POS" };

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireUser();
  const params = await searchParams;
  const snapshot = await inventorySnapshot({ query: params.q });
  const { totals, categories, query } = snapshot;

  const hasResults = categories.length > 0;
  // When a search returns matches across a few categories it's friendlier to
  // pre-expand them than to make the user click through every fold.
  const expandAll = query.length > 0 && categories.length <= 3;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Catalog"
        title="Inventory"
        description="Everything currently on the shelf, grouped by category. Search by name, brand, SKU, barcode, or category."
      />

      <InventorySearch defaultQuery={query} />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="Unique SKUs" value={String(totals.skuCount)} />
        <StatCard label="Units on hand" value={totals.units.toLocaleString()} />
        <StatCard
          label="Retail value"
          value={`Rs ${formatAmount(totals.retailValue)}`}
          accent
        />
        <StatCard
          label="Cost value"
          value={`Rs ${formatAmount(totals.costValue)}`}
        />
        <StatCard
          label="Low / out"
          value={`${totals.lowCount} / ${totals.outCount}`}
          tone={totals.outCount > 0 ? "danger" : totals.lowCount > 0 ? "warn" : undefined}
        />
      </section>

      {!hasResults ? (
        <div className="rounded-lg border border-white/10 bg-card p-10 text-center text-sm text-ink-muted">
          {query
            ? `Nothing matches “${query}”.`
            : "Inventory is empty — add products to start tracking stock."}
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => (
            <CategoryGroup
              key={cat.key}
              category={cat}
              defaultOpen={expandAll}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryGroup({
  category,
  defaultOpen,
}: {
  category: InventoryCategory;
  defaultOpen: boolean;
}) {
  return (
    <details
      className="group overflow-hidden rounded-lg border border-white/10 bg-card open:bg-card"
      {...(defaultOpen ? { open: true } : {})}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/30">
        <svg
          aria-hidden
          className="h-4 w-4 flex-shrink-0 text-ink-muted transition-transform group-open:rotate-90"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="m9 6 6 6-6 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
          <h2 className="truncate text-sm font-semibold text-ink">
            {category.name}
          </h2>
          <div className="flex flex-shrink-0 items-baseline gap-4 text-xs text-ink-muted">
            <span>
              <span className="tabular-nums text-ink">{category.skuCount}</span>{" "}
              SKU{category.skuCount === 1 ? "" : "s"}
            </span>
            <span>
              <span className="tabular-nums text-ink">
                {category.units.toLocaleString()}
              </span>{" "}
              units
            </span>
            <span className="hidden sm:inline">
              Rs{" "}
              <span className="tabular-nums text-ink">
                {formatAmount(category.retailValue)}
              </span>
            </span>
          </div>
        </div>
      </summary>

      <div className="border-t border-white/10">
        <table className="min-w-full divide-y divide-white/5 text-sm">
          <thead className="bg-surface/40 text-left text-xs uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-4 py-2.5">Product</th>
              <th className="px-4 py-2.5">Code</th>
              <th className="px-4 py-2.5 text-right">Sell</th>
              <th className="px-4 py-2.5 text-right">On hand</th>
              <th className="px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {category.products.map((p) => (
              <ProductRow key={p.id} product={p} />
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function ProductRow({ product }: { product: InventoryProduct }) {
  const stockClass =
    product.status === "OUT"
      ? "text-rose-300"
      : product.status === "LOW"
        ? "text-amber-300"
        : "text-ink";
  const code = product.barcode ?? product.sku ?? "—";
  return (
    <tr>
      <td className="px-4 py-2.5">
        <div className="font-medium text-ink">{product.name}</div>
        {product.brand ? (
          <div className="text-xs text-ink-muted">{product.brand}</div>
        ) : null}
      </td>
      <td className="px-4 py-2.5 font-mono text-xs text-ink-soft">{code}</td>
      <td className="px-4 py-2.5 text-right tabular-nums text-ink-soft">
        {formatAmount(product.sellPrice)}
      </td>
      <td
        className={`px-4 py-2.5 text-right tabular-nums font-medium ${stockClass}`}
      >
        {product.currentStock}
      </td>
      <td className="px-4 py-2.5">
        <StatusBadge status={product.status} />
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: InventoryProduct["status"] }) {
  if (status === "OUT") {
    return (
      <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-xs font-semibold text-rose-200">
        Out
      </span>
    );
  }
  if (status === "LOW") {
    return (
      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-200">
        Low
      </span>
    );
  }
  return (
    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-200">
      In stock
    </span>
  );
}

function StatCard({
  label,
  value,
  accent,
  tone,
}: {
  label: string;
  value: string;
  accent?: boolean;
  tone?: "warn" | "danger";
}) {
  const valueClass = accent
    ? "text-rose-300"
    : tone === "danger"
      ? "text-rose-300"
      : tone === "warn"
        ? "text-amber-300"
        : "text-ink";
  return (
    <div className="rounded-lg border border-white/10 bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-ink-muted">
        {label}
      </div>
      <div className={`mt-1 text-xl font-semibold tabular-nums ${valueClass}`}>
        {value}
      </div>
    </div>
  );
}

function formatAmount(n: string): string {
  const num = Number(n);
  if (!Number.isFinite(num)) return n;
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
