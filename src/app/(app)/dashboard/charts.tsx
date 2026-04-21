type SalesPoint = { date: string; count: number; total: string };
type TopProduct = { name: string; qty: number; revenue: string };
type CategorySlice = { id: string; name: string; total: string };
type PaymentSlice = { method: string; total: string };
type LowStockItem = {
  id: string;
  name: string;
  currentStock: number;
  reorderLevel: number;
};

/**
 * Bar chart of daily sales revenue. Hand-rolled SVG with a `viewBox` so it
 * scales with its container — no chart library needed for this small surface.
 */
export function SalesByDayChart({ data }: { data: SalesPoint[] }) {
  // `salesByDay` returns reverse-chron; reverse back so the chart reads left → right.
  const points = [...data].reverse();
  const totals = points.map((p) => Number(p.total));
  const max = Math.max(1, ...totals);

  const width = 560;
  const height = 160;
  const padX = 8;
  const padY = 24;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;
  const barGap = 4;
  const barW = Math.max(4, chartW / points.length - barGap);

  return (
    <div className="rounded-lg border border-white/10 bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-ink">Sales · last 14 days</h2>
        <span className="text-xs text-ink-muted">
          Peak {max === 1 && totals.every((t) => t === 0) ? "—" : max.toFixed(2)}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-40 w-full"
        role="img"
        aria-label="Daily sales revenue, last 14 days"
      >
        {points.map((p, i) => {
          const value = Number(p.total);
          const h = max === 0 ? 0 : (value / max) * chartH;
          const x = padX + i * (barW + barGap);
          const y = padY + chartH - h;
          const isLast = i === points.length - 1;
          return (
            <g key={p.date}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={2}
                className={isLast ? "fill-rose-400" : "fill-rose-500/40"}
              />
              {i % 2 === 0 ? (
                <text
                  x={x + barW / 2}
                  y={height - 4}
                  textAnchor="middle"
                  className="fill-ink-muted text-[9px]"
                >
                  {formatShortDate(p.date)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/**
 * Horizontal bar chart of the top products by units sold.
 */
export function TopProductsChart({ data }: { data: TopProduct[] }) {
  const max = Math.max(1, ...data.map((d) => d.qty));

  return (
    <div className="rounded-lg border border-white/10 bg-card p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-medium text-ink">
        Top products · last 30 days
      </h2>
      {data.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-muted">
          No sales in the last 30 days.
        </p>
      ) : (
        <ul className="space-y-2">
          {data.map((p) => {
            const pct = (p.qty / max) * 100;
            return (
              <li key={p.name} className="grid grid-cols-[1fr_auto] items-center gap-3">
                <div>
                  <p className="truncate text-sm text-ink" title={p.name}>
                    {p.name}
                  </p>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface">
                    <div
                      className="h-full rounded-full bg-rose-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-medium tabular-nums text-ink">
                  {p.qty}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function formatShortDate(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * SVG donut of revenue by category. The donut uses stroke-dasharray maths on a
 * single circle so each slice is one `<circle>` — no math on arcs, no library.
 * Order of slices matches the order we receive them (already sorted desc).
 */
const DONUT_PALETTE = [
  "#e9507d", // rose-500ish
  "#b03052",
  "#f59e0b", // amber
  "#10b981", // emerald
  "#6366f1", // indigo
  "#64748b", // slate for "other"
];

export function CategoryDonut({ data }: { data: CategorySlice[] }) {
  const totals = data.map((d) => Number(d.total));
  const grand = totals.reduce((a, b) => a + b, 0);

  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const slices = data.map((d, i) => {
    const pct = grand === 0 ? 0 : Number(d.total) / grand;
    const dash = pct * circumference;
    const el = (
      <circle
        key={d.id}
        r={radius}
        cx="60"
        cy="60"
        fill="transparent"
        stroke={DONUT_PALETTE[i % DONUT_PALETTE.length]}
        strokeWidth="14"
        strokeDasharray={`${dash} ${circumference - dash}`}
        strokeDashoffset={-offset}
        // A tiny gap between slices reads cleaner than a continuous ring.
        style={{ transition: "stroke-dashoffset 400ms" }}
      />
    );
    offset += dash;
    return el;
  });

  return (
    <div className="rounded-lg border border-white/10 bg-card p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-medium text-ink">
        Revenue by category · last 30 days
      </h2>
      {grand === 0 ? (
        <p className="py-6 text-center text-sm text-ink-muted">
          No sales in the last 30 days.
        </p>
      ) : (
        <div className="flex items-center gap-5">
          <svg
            viewBox="0 0 120 120"
            className="h-36 w-36 shrink-0 -rotate-90"
            role="img"
            aria-label="Revenue share by category"
          >
            <circle
              r={radius}
              cx="60"
              cy="60"
              fill="transparent"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="14"
            />
            {slices}
          </svg>
          <ul className="flex-1 space-y-1.5 text-sm">
            {data.map((d, i) => {
              const pct = grand === 0 ? 0 : (Number(d.total) / grand) * 100;
              return (
                <li
                  key={d.id}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden
                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                      style={{
                        backgroundColor:
                          DONUT_PALETTE[i % DONUT_PALETTE.length],
                      }}
                    />
                    <span className="truncate text-ink" title={d.name}>
                      {d.name}
                    </span>
                  </span>
                  <span className="tabular-nums text-ink-muted">
                    {pct.toFixed(0)}%
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Cash-vs-card horizontal bar for the last 30 days.
 */
const METHOD_COLOR: Record<string, string> = {
  CASH: "bg-emerald-500",
  CARD: "bg-indigo-500",
  QR: "bg-amber-500",
  BANK: "bg-sky-500",
};

export function PaymentMethodSplit({ data }: { data: PaymentSlice[] }) {
  const totals = data.map((d) => Number(d.total));
  const grand = totals.reduce((a, b) => a + b, 0);

  return (
    <div className="rounded-lg border border-white/10 bg-card p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-medium text-ink">
        Payment methods · last 30 days
      </h2>
      {grand === 0 ? (
        <p className="py-6 text-center text-sm text-ink-muted">
          No payments in the last 30 days.
        </p>
      ) : (
        <>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface">
            {data.map((d) => {
              const pct = (Number(d.total) / grand) * 100;
              return (
                <div
                  key={d.method}
                  className={`h-full ${METHOD_COLOR[d.method] ?? "bg-rose-500"}`}
                  style={{ width: `${pct}%` }}
                  title={`${d.method}: ${d.total}`}
                />
              );
            })}
          </div>
          <ul className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
            {data.map((d) => {
              const pct = (Number(d.total) / grand) * 100;
              return (
                <li
                  key={d.method}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className={`inline-block h-2.5 w-2.5 rounded-sm ${METHOD_COLOR[d.method] ?? "bg-rose-500"}`}
                    />
                    <span className="text-ink">{d.method}</span>
                  </span>
                  <span className="tabular-nums text-ink-muted">
                    {pct.toFixed(0)}% · {d.total}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

/**
 * Inline preview of the items at or below reorder level. Clicking through
 * takes the user to /reports for the full table.
 */
export function LowStockPreview({ data }: { data: LowStockItem[] }) {
  return (
    <div className="rounded-lg border border-white/10 bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-ink">Low stock · top 5</h2>
        <a href="/reports" className="text-xs text-rose-300 hover:text-rose-200">
          View all →
        </a>
      </div>
      {data.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-muted">
          Every tracked product is above its reorder level.
        </p>
      ) : (
        <ul className="divide-y divide-white/5">
          {data.map((p) => {
            const pct = Math.min(
              100,
              Math.round((p.currentStock / Math.max(1, p.reorderLevel)) * 100),
            );
            const barColor = pct === 0 ? "bg-rose-500" : "bg-amber-500";
            return (
              <li key={p.id} className="py-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm text-ink" title={p.name}>
                    {p.name}
                  </p>
                  <p className="shrink-0 text-xs tabular-nums text-ink-muted">
                    {p.currentStock} / {p.reorderLevel}
                  </p>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface">
                  <div
                    className={`h-full rounded-full ${barColor}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
