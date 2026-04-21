type SalesPoint = { date: string; count: number; total: string };
type TopProduct = { name: string; qty: number; revenue: string };

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
                className={isLast ? "fill-rose-600" : "fill-rose-200"}
              />
              {i % 2 === 0 ? (
                <text
                  x={x + barW / 2}
                  y={height - 4}
                  textAnchor="middle"
                  className="fill-gray-500 text-[9px]"
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
