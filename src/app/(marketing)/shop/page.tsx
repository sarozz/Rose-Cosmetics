import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";

export const metadata: Metadata = {
  title: "How to shop · Rose Cosmetics",
  description:
    "Three ways to shop Rose Cosmetics: visit the Chardobato store, message us on Instagram @rose.cosmetics67, or DM us on TikTok @rosecosmetic83. We deliver nationwide.",
  alternates: { canonical: "/shop" },
};

export default function ShopPage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="relative mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-24">
          <p className="text-sm font-semibold uppercase tracking-widest text-rose-600">
            How to shop
          </p>
          <h1 className="mt-3 font-[Allura,cursive] text-6xl leading-none text-rose-600 sm:text-7xl">
            Three easy ways
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-stone-600">
            Walk in, or send us a message — we deliver across Nepal usually
            within 1 to 3 days.
          </p>
        </div>
      </section>

      <section className="bg-white pb-20">
        <div className="mx-auto grid max-w-5xl gap-6 px-4 sm:px-6 md:grid-cols-3">
          <Card
            number={1}
            title="Visit the store"
            body="Pop into our Chardobato shop, try the shades, smell the perfumes, swatch the lipsticks. We're open daily 9 AM – 8 PM."
            ctaLabel="See the map"
            href={"/contact" as Route}
          />
          <Card
            number={2}
            title="DM us on Instagram"
            body="Send a message with the product you want and your address. We'll confirm price, pack it, and dispatch."
            ctaLabel="@rose.cosmetics67"
            external="https://instagram.com/rose.cosmetics67"
          />
          <Card
            number={3}
            title="DM us on TikTok"
            body="Saw something on our TikTok? Reply to the video or DM us directly — same flow, same delivery times."
            ctaLabel="@rosecosmetic83"
            external="https://tiktok.com/@rosecosmetic83"
          />
        </div>
      </section>

      <section className="bg-rose-50/40 py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-semibold text-stone-800 sm:text-3xl">
            How delivery works
          </h2>
          <ol className="mt-8 space-y-5">
            <Step
              n={1}
              title="DM your order"
              body="Tell us what you want, your name, phone, and full delivery address. Picking is easier if you share a photo or product name."
            />
            <Step
              n={2}
              title="We confirm and pack"
              body="We confirm the total (and whether it's COD or paid in advance via eSewa / bank). Your package goes out the same or next day."
            />
            <Step
              n={3}
              title="Track and receive"
              body="We send you a private tracking link. As soon as the courier sets out, you'll see the status update in real time."
            />
          </ol>
        </div>
      </section>
    </>
  );
}

function Card({
  number,
  title,
  body,
  ctaLabel,
  href,
  external,
}: {
  number: number;
  title: string;
  body: string;
  ctaLabel: string;
  href?: Route;
  external?: string;
}) {
  return (
    <article className="rounded-3xl border border-rose-100 bg-cream/60 p-7 shadow-sm transition-transform hover:-translate-y-1">
      <p className="font-[Allura,cursive] text-5xl leading-none text-rose-400">
        {number}
      </p>
      <h2 className="mt-3 text-lg font-semibold text-stone-800">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">{body}</p>
      {external ? (
        <a
          href={external}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block text-sm font-semibold text-rose-600 hover:underline"
        >
          {ctaLabel} →
        </a>
      ) : href ? (
        <Link
          href={href}
          className="mt-4 inline-block text-sm font-semibold text-rose-600 hover:underline"
        >
          {ctaLabel} →
        </Link>
      ) : null}
    </article>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="flex gap-4 rounded-xl bg-white p-5 shadow-sm">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-rose-600 text-sm font-bold text-white">
        {n}
      </span>
      <div>
        <h3 className="text-base font-semibold text-stone-800">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-stone-600">{body}</p>
      </div>
    </li>
  );
}
