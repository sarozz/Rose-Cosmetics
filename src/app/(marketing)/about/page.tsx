import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";

export const metadata: Metadata = {
  title: "About · Rose Cosmetics",
  description:
    "Rose Cosmetics is a family cosmetics shop in Chardobato, Bhaktapur — skincare, haircare, makeup, fragrances and everyday essentials. Walk in or DM us; we courier across Nepal.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Rose Cosmetics",
    description:
      "A family beauty store in Chardobato, Bhaktapur. We stock the things we'd buy ourselves.",
    type: "website",
  },
};

const BREADCRUMB_DATA = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://rosecosmetics.live" },
    { "@type": "ListItem", position: 2, name: "About", item: "https://rosecosmetics.live/about" },
  ],
};

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_DATA) }}
      />
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute -right-24 -top-16 h-72 w-72 rounded-full bg-rose-200/55 blur-3xl sm:-right-32 sm:-top-24 sm:h-96 sm:w-96"
        />
        <div className="relative mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-28">
          <p className="text-xs font-semibold uppercase tracking-widest text-rose-600 sm:text-sm">
            Our story
          </p>
          <h1 className="mt-2 font-[Allura,cursive] text-5xl leading-none text-rose-600 sm:mt-3 sm:text-7xl">
            Hi, we&apos;re Rose.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-stone-700 sm:mt-6 sm:text-lg">
            Rose Cosmetics is a family cosmetics shop in Chardobato,
            Bhaktapur. Skincare, haircare, makeup, fragrances —
            everything we&apos;d want on our own bathroom shelf, picked
            so you don&apos;t have to guess between ten versions of the
            same thing.
          </p>
        </div>
      </section>

      <section className="bg-white py-10 sm:py-16">
        <div className="mx-auto max-w-3xl space-y-8 px-4 sm:space-y-10 sm:px-6">
          <Block
            heading="Small, careful range"
            body="We don&apos;t stock everything. Each product earns its place — usually after one of us has carried it through a wedding, a long monsoon shift, or a long-haul flight. If it disappoints, it&apos;s off the shelf."
          />
          <Block
            heading="Honest answers"
            body="Tell us your skin or hair type, your budget, what you&apos;re trying to fix. We&apos;ll point you at what works — even if it&apos;s the cheaper option. We&apos;d rather see you back next month than oversell you once."
          />
          <Block
            heading="Made for Nepal"
            body="Most of our customers find us on Instagram and TikTok and order from their phone. We courier across the country and send a private tracking link the moment the package leaves the shop."
          />
        </div>
      </section>

      <section className="bg-rose-50/50 py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-xl font-semibold text-stone-800 sm:text-3xl">
            Come say hi?
          </h2>
          <p className="mt-2 text-sm text-stone-600 sm:mt-3 sm:text-base">
            Drop by in Chardobato or message us on Instagram — that&apos;s
            usually the fastest way.
          </p>
          <div className="mt-5 grid gap-2 sm:mt-7 sm:flex sm:flex-wrap sm:justify-center sm:gap-3">
            <Link
              href={"/contact" as Route}
              className="rounded-full bg-rose-600 px-6 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
            >
              Find the shop
            </Link>
            <a
              href="https://instagram.com/rose.cosmetics67"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-rose-600 px-6 py-3 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50"
            >
              Message on Instagram
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

function Block({ heading, body }: { heading: string; body: string }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-stone-800 sm:text-2xl">
        {heading}
      </h2>
      <p className="mt-3 text-base leading-relaxed text-stone-600">{body}</p>
    </div>
  );
}
