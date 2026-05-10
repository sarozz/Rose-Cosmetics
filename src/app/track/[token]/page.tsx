import { notFound } from "next/navigation";
import type { OnlineOrderStatus } from "@prisma/client";
import { RoseLogo } from "@/components/rose-logo";
import { getByPublicToken } from "@/lib/services/online-order";

export const metadata = { title: "Track your order — Rose Cosmetics" };
export const dynamic = "force-dynamic";

const STAGES: OnlineOrderStatus[] = [
  "CONFIRMED",
  "PACKAGING",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

const STATUS_LABEL: Record<OnlineOrderStatus, string> = {
  CONFIRMED: "Order confirmed",
  PACKAGING: "Packaging",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

const STATUS_COPY: Record<OnlineOrderStatus, string> = {
  CONFIRMED: "We've received your order and it's queued for packing.",
  PACKAGING: "Our team is packing your order right now.",
  OUT_FOR_DELIVERY: "Your order has left the shop and is on its way.",
  DELIVERED: "Your order has been delivered. Enjoy!",
  CANCELLED: "This order has been cancelled. Reach out if this is unexpected.",
};

export default async function PublicTrackingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const order = await getByPublicToken(token);
  if (!order) notFound();

  const isCancelled = order.status === "CANCELLED";
  const currentIndex = STAGES.indexOf(order.status);

  return (
    <div className="min-h-screen bg-page py-10">
      <div className="mx-auto max-w-2xl px-4">
        <header className="mb-8 flex items-center justify-center">
          <RoseLogo size="md" />
        </header>

        <main className="rounded-2xl border border-white/10 bg-card p-6 shadow-lg sm:p-8">
          <p className="text-xs font-medium uppercase tracking-wide text-rose-300">
            Order {order.orderRef}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">
            Hi {order.customerName.split(" ")[0]} 👋
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            {STATUS_COPY[order.status]}
          </p>

          {!isCancelled ? (
            <ol className="mt-8 space-y-3">
              {STAGES.map((stage, i) => {
                const reached = i <= currentIndex;
                const active = i === currentIndex;
                return (
                  <li
                    key={stage}
                    className={`flex items-start gap-3 rounded-lg border p-3 ${
                      active
                        ? "border-rose-400/40 bg-rose-500/10"
                        : reached
                          ? "border-emerald-400/30 bg-emerald-500/10"
                          : "border-white/10 bg-page/40"
                    }`}
                  >
                    <span
                      className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        active
                          ? "bg-rose-500 text-white"
                          : reached
                            ? "bg-emerald-500 text-white"
                            : "bg-white/10 text-ink-muted"
                      }`}
                    >
                      {reached ? "✓" : i + 1}
                    </span>
                    <div className="flex-1">
                      <p
                        className={`text-sm font-semibold ${
                          active
                            ? "text-rose-200"
                            : reached
                              ? "text-emerald-200"
                              : "text-ink-muted"
                        }`}
                      >
                        {STATUS_LABEL[stage]}
                      </p>
                      {active ? (
                        <p className="mt-0.5 text-xs text-ink-soft">
                          {STATUS_COPY[stage]}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="mt-8 rounded-lg border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">
              {STATUS_COPY.CANCELLED}
            </div>
          )}

          <section className="mt-8 border-t border-white/10 pt-6">
            <h2 className="text-sm font-semibold text-ink">Order summary</h2>
            <ul className="mt-3 space-y-2">
              {order.items.map((it, i) => (
                <li
                  key={i}
                  className="flex items-baseline justify-between text-sm"
                >
                  <span className="text-ink">
                    {it.product.name}
                    {it.product.brand ? (
                      <span className="text-ink-muted"> · {it.product.brand}</span>
                    ) : null}
                    <span className="ml-2 text-xs text-ink-muted">× {it.qty}</span>
                  </span>
                  <span className="tabular-nums text-ink-soft">
                    Rs {it.lineTotal.toString()}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-baseline justify-between border-t border-white/10 pt-3 text-sm">
              <span className="font-semibold text-ink">Total</span>
              <span className="tabular-nums font-semibold text-rose-300">
                Rs {order.total.toString()}
              </span>
            </div>
          </section>

          <section className="mt-6 rounded-md border border-white/5 bg-page/40 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
              Delivering to
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-ink-soft">
              {order.customerAddress}
            </p>
          </section>

          {order.events.length > 1 ? (
            <section className="mt-8 border-t border-white/10 pt-6">
              <h2 className="text-sm font-semibold text-ink">Updates</h2>
              <ol className="mt-3 space-y-2 text-xs">
                {order.events
                  .slice()
                  .reverse()
                  .map((ev, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="font-mono text-ink-muted">
                        {ev.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                      </span>
                      <span className="flex-1 text-ink-soft">
                        <strong className="text-ink">
                          {STATUS_LABEL[ev.status]}
                        </strong>
                        {ev.note ? ` — ${ev.note}` : ""}
                      </span>
                    </li>
                  ))}
              </ol>
            </section>
          ) : null}
        </main>

        <footer className="mt-6 text-center text-xs text-ink-muted">
          Refresh this page anytime to see the latest update.
        </footer>
      </div>
    </div>
  );
}
