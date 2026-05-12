import { notFound } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { requireRole, SALES_ROLES } from "@/lib/auth";
import { RoseLogo } from "@/components/rose-logo";
import { getOnlineOrder } from "@/lib/services/online-order";
import { AutoPrint } from "./auto-print";
import { LabelPrintButton } from "./print-button";

export const metadata = { title: "Shipping label — Rose Cosmetics" };

export default async function OnlineOrderLabelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(SALES_ROLES);
  const { id } = await params;
  const order = await getOnlineOrder(id);
  if (!order) notFound();

  const isCOD = order.paymentMode === "COD";

  return (
    <div className="mx-auto max-w-xl p-6 print:p-0">
      {/* On-screen toolbar — hidden when printing. */}
      <div className="no-print mb-4 flex items-center justify-between">
        <Link
          href={`/online/${order.id}` as Route}
          className="text-sm text-rose-300 hover:underline"
        >
          ← Back to order
        </Link>
        <LabelPrintButton />
      </div>

      <div className="print-clean rounded-2xl border-2 border-black/80 bg-white p-6 text-black shadow-sm print:rounded-none print:border-0 print:shadow-none">
        <header className="flex items-center justify-between border-b border-black/40 pb-3">
          <RoseLogo size="md" />
          <p className="font-mono text-xs text-black/70">{order.orderRef}</p>
        </header>

        {/* Payment block — top-of-mind for the courier. COD shows the
            amount big so they can ask the customer for the right
            money. PREPAID shows a Paid badge so the courier knows not
            to collect. */}
        {isCOD ? (
          <section className="mt-4 rounded-md border-2 border-rose-600 bg-rose-50 p-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-rose-700">
              Cash on Delivery
            </p>
            <p className="mt-1 text-3xl font-extrabold tabular-nums leading-tight text-rose-700">
              Rs {order.total.toString()}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-rose-700/80">
              Collect from customer on arrival
            </p>
          </section>
        ) : (
          <section className="mt-4 rounded-md border-2 border-emerald-600 bg-emerald-50 p-3 text-center">
            <p className="text-2xl font-extrabold uppercase tracking-widest text-emerald-700">
              ✓ Paid
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-emerald-700/80">
              Do not collect any money from customer
            </p>
          </section>
        )}

        <section className="mt-5 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-black/60">
            Deliver to
          </p>
          <p className="text-2xl font-bold leading-tight">
            {order.customerName}
          </p>
          {order.customerPhone ? (
            <p className="text-base font-semibold">
              📞 {order.customerPhone}
            </p>
          ) : null}
          <p className="mt-2 whitespace-pre-wrap text-base leading-snug">
            {order.customerAddress}
          </p>
        </section>

        {order.note ? (
          <section className="mt-5 rounded-md border border-black/30 bg-black/5 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-black/60">
              Note for the driver
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-snug">
              {order.note}
            </p>
          </section>
        ) : null}

        <section className="mt-5 flex items-baseline justify-between border-t border-black/20 pt-3">
          <p className="text-[10px] uppercase tracking-widest text-black/60">
            {order.items.length} item
            {order.items.length === 1 ? "" : "s"} ·{" "}
            {order.channel.toLowerCase()}
          </p>
          <p className="text-[10px] tabular-nums text-black/60">
            {new Date().toISOString().slice(0, 10)}
          </p>
        </section>

        <section className="mt-6 rounded-md bg-black/5 p-4 text-center">
          <p
            className="font-[Allura,cursive] text-3xl leading-none text-rose-700"
            aria-label="Thank you"
          >
            Thank you!
          </p>
          <p className="mt-2 text-xs italic text-black/70">
            We hope you love your Rose Cosmetics order. Tag us
            on Instagram <span className="font-medium">@rose.cosmetics67</span>{" "}
            or TikTok <span className="font-medium">@rosecosmetic83</span> —{" "}
            <span className="font-medium">your smile is our favorite shade.</span>
          </p>
        </section>
      </div>

      <AutoPrint />
    </div>
  );
}
