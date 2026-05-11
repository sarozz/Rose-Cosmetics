import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import type { OnlineOrderStatus } from "@prisma/client";
import { requireRole, SALES_ROLES, INVENTORY_WRITE_ROLES, hasRole } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import {
  getOnlineOrder,
  nextStatuses,
} from "@/lib/services/online-order";
import { CopyTrackingLink } from "./copy-link";
import { StatusForm } from "./status-form";

export const metadata = { title: "Order — Rose Cosmetics" };

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

const STATUS_UPDATE_ROLES = Array.from(
  new Set([...SALES_ROLES, ...INVENTORY_WRITE_ROLES]),
);

export default async function OnlineOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireRole(SALES_ROLES);
  const { id } = await params;
  const order = await getOnlineOrder(id);
  if (!order) notFound();

  const canTransition = hasRole(actor, STATUS_UPDATE_ROLES);
  const available = nextStatuses(order.status);

  // Build the public tracking URL using the request's host so dev / prod
  // both work without a hard-coded domain.
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host") ?? "rose-cosmetics.local";
  const trackingUrl = `${proto}://${host}/track/${order.publicToken}`;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Sales · Online"
        title={order.orderRef}
        description={`${STATUS_LABEL[order.status]} · ${order.channel.toLowerCase()} · placed by ${order.cashier.displayName}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/online/${order.id}/label` as Route}
              target="_blank"
              className="btn-primary"
            >
              Print label
            </Link>
            <Link href={"/online" as Route} className="btn-secondary">
              Back to orders
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <section className="md:col-span-2 space-y-4">
          <div className="rounded-lg border border-white/10 bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink">Items</h2>
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="pb-2">Product</th>
                  <th className="pb-2 text-right">Qty</th>
                  <th className="pb-2 text-right">Unit</th>
                  <th className="pb-2 text-right">Line</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {order.items.map((it) => (
                  <tr key={it.id}>
                    <td className="py-2">
                      <div className="font-medium text-ink">{it.product.name}</div>
                      <div className="text-xs text-ink-muted">
                        {it.product.brand ? `${it.product.brand} · ` : ""}
                        {it.product.barcode ? (
                          <span className="font-mono">{it.product.barcode}</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-2 text-right tabular-nums text-ink-soft">
                      {it.qty}
                    </td>
                    <td className="py-2 text-right tabular-nums text-ink-soft">
                      {it.unitPrice.toString()}
                    </td>
                    <td className="py-2 text-right tabular-nums font-medium text-ink">
                      {it.lineTotal.toString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/10 text-sm">
                  <td colSpan={3} className="pt-3 text-right text-ink-muted">
                    Subtotal
                  </td>
                  <td className="pt-3 text-right tabular-nums text-ink">
                    {order.subtotal.toString()}
                  </td>
                </tr>
                {Number(order.discount.toString()) > 0 ? (
                  <tr>
                    <td colSpan={3} className="pt-1 text-right text-ink-muted">
                      Discount
                    </td>
                    <td className="pt-1 text-right tabular-nums text-amber-300">
                      −{order.discount.toString()}
                    </td>
                  </tr>
                ) : null}
                <tr>
                  <td colSpan={3} className="pt-2 text-right font-semibold text-ink">
                    Total
                  </td>
                  <td className="pt-2 text-right tabular-nums font-semibold text-rose-300">
                    {order.total.toString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="rounded-lg border border-white/10 bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink">Timeline</h2>
            <ol className="space-y-2">
              {order.events.map((ev) => (
                <li key={ev.id} className="flex items-start gap-3 text-sm">
                  <span
                    className={`mt-0.5 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_TONE[ev.status]}`}
                  >
                    {STATUS_LABEL[ev.status]}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-ink-muted">
                      {ev.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                      {ev.actor ? ` · ${ev.actor.displayName}` : ""}
                    </p>
                    {ev.note ? (
                      <p className="text-sm text-ink">{ev.note}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-lg border border-white/10 bg-card p-4">
            <h2 className="text-sm font-semibold text-ink">Customer</h2>
            <p className="mt-2 text-sm font-medium text-ink">{order.customerName}</p>
            {order.customerPhone ? (
              <p className="text-xs text-ink-soft">📞 {order.customerPhone}</p>
            ) : null}
            <p className="mt-2 whitespace-pre-wrap text-xs text-ink-muted">
              {order.customerAddress}
            </p>
            {order.note ? (
              <div className="mt-3 rounded-md border border-white/5 bg-page/40 p-2 text-xs text-ink-soft">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                  Note
                </p>
                <p className="mt-1 whitespace-pre-wrap">{order.note}</p>
              </div>
            ) : null}
          </div>

          <div className="rounded-lg border border-white/10 bg-card p-4">
            <h2 className="text-sm font-semibold text-ink">Tracking link</h2>
            <p className="mt-1 text-xs text-ink-muted">
              Send this to the customer so they can check progress without logging in.
            </p>
            <CopyTrackingLink url={trackingUrl} />
          </div>

          {canTransition ? (
            <div className="rounded-lg border border-white/10 bg-card p-4">
              <h2 className="text-sm font-semibold text-ink">Update status</h2>
              <p className="mt-1 text-xs text-ink-muted">
                Current: <strong>{STATUS_LABEL[order.status]}</strong>
              </p>
              <div className="mt-3">
                <StatusForm orderId={order.id} available={available} />
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
