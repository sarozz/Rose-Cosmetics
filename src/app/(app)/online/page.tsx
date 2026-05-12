import Link from "next/link";
import type { Route } from "next";
import type { OnlineOrderStatus } from "@prisma/client";
import { requireRole, SALES_ROLES } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { listOnlineOrders } from "@/lib/services/online-order";

export const metadata = { title: "Online orders — Rose Cosmetics" };

const STATUS_LABEL: Record<OnlineOrderStatus, string> = {
  CONFIRMED: "Confirmed",
  PACKAGING: "Packaging",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

const STATUS_TONE: Record<OnlineOrderStatus, string> = {
  CONFIRMED: "bg-sky-500/15 text-sky-200",
  PACKAGING: "bg-amber-500/15 text-amber-200",
  OUT_FOR_DELIVERY: "bg-violet-500/15 text-violet-200",
  DELIVERED: "bg-emerald-500/15 text-emerald-200",
  CANCELLED: "bg-rose-500/15 text-rose-200",
};

export default async function OnlineOrdersPage() {
  await requireRole(SALES_ROLES);
  const orders = await listOnlineOrders();

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Sales"
        title="Online orders"
        description="Orders from Instagram, TikTok, and other DM channels. Walk each one through packaging → out for delivery → delivered."
        actions={
          <Link href={"/online/new" as Route} className="btn-primary">
            New online order
          </Link>
        }
      />

      <div className="overflow-x-auto rounded-lg border border-white/10 bg-card">
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Channel</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3 text-right">Lines</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Placed</th>
              <th className="px-4 py-3">Cashier</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-ink-muted">
                  No online orders yet.
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3 font-mono text-xs text-ink">
                    <Link
                      href={`/online/${o.id}` as Route}
                      className="text-rose-300 hover:underline"
                    >
                      {o.orderRef}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink">{o.customerName}</td>
                  <td className="px-4 py-3 text-xs uppercase tracking-wide text-ink-soft">
                    {o.channel}
                  </td>
                  <td className="px-4 py-3">
                    {o.paymentMode === "COD" ? (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200">
                        COD
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-200">
                        Paid
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                    {o._count.items}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-ink">
                    {o.total.toString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_TONE[o.status]}`}
                    >
                      {STATUS_LABEL[o.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-soft">
                    {o.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {o.cashier.displayName}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
