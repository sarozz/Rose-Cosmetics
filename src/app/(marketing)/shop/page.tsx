import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";

export const metadata: Metadata = {
  title: "How to order · Rose Cosmetics",
  description:
    "Three ways to buy from Rose Cosmetics — walk into our Chardobato shop, message us on Instagram (@rose.cosmetics67) or TikTok (@rosecosmetic83). We courier across Nepal in 1 to 3 days.",
  alternates: { canonical: "/shop" },
};

export default function ShopPage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="relative mx-auto max-w-3xl px-4 py-12 text-center sm:px-6 sm:py-24">
          <p className="text-xs font-semibold uppercase tracking-widest text-rose-600 sm:text-sm">
            How to order
          </p>
          <h1 className="mt-2 font-[Allura,cursive] text-5xl leading-none text-rose-600 sm:mt-3 sm:text-7xl">
            Three easy ways
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-stone-700 sm:mt-5 sm:text-base">
            Walk in, or message us. Either way we&apos;ll get it to you —
            usually within 1 to 3 days anywhere in Nepal.
          </p>
        </div>
      </section>

      <section className="bg-white pb-14 sm:pb-20">
        <div className="mx-auto grid max-w-5xl gap-4 px-4 sm:gap-6 sm:px-6 md:grid-cols-3">
          <Card
            number={1}
            title="Walk into the shop"
            body="Come swatch in person, smell the perfumes, ask us anything. We&apos;re in Chardobato, open every day from 9 in the morning to 8 in the evening."
            ctaLabel="See the map"
            href={"/contact" as Route}
          />
          <Card
            number={2}
            title="Message us on Instagram"
            body="Send a DM with the product (or a screenshot) plus your name, phone and address. We&apos;ll confirm price, pack it, and send a tracking link."
            ctaLabel="@rose.cosmetics67"
            external="https://instagram.com/rose.cosmetics67"
          />
          <Card
            number={3}
            title="Message us on TikTok"
            body="Saw it on our TikTok? Reply to the video or DM us — same flow, same delivery times."
            ctaLabel="@rosecosmetic83"
            external="https://tiktok.com/@rosecosmetic83"
          />
        </div>
      </section>

      <section className="bg-rose-50/50 py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center text-xl font-semibold text-stone-800 sm:text-3xl">
            How delivery works
          </h2>
          <ol className="mt-6 space-y-4 sm:mt-8 sm:space-y-5">
            <Step
              n={1}
              title="Send your order"
              body="Tell us what you want plus your name, phone number and full delivery address. A photo or product name makes things easier."
            />
            <Step
              n={2}
              title="We confirm and pack"
              body="We&apos;ll send you the total and ask if you want to pay by eSewa / bank or on delivery. Your package usually leaves the same day."
            />
            <Step
              n={3}
              title="You track and receive"
              body="We send a private tracking link the moment the courier picks it up. You&apos;ll see when it&apos;s on the way and when it&apos;s at your door."
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
    <article className="rounded-3xl border border-stone-200/70 bg-stone-50/60 p-7 shadow-sm transition-transform hover:-translate-y-1">
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
