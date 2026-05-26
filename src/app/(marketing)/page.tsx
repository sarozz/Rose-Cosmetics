import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";

export const metadata: Metadata = {
  title: "Rose Cosmetics · Cosmetics shop in Chardobato, Bhaktapur",
  description:
    "Skincare, haircare, makeup, fragrances and everyday essentials from Rose Cosmetics — a family cosmetics shop in Chardobato, Bhaktapur. Walk in, or message us on Instagram or TikTok and we courier across Nepal.",
  openGraph: {
    title: "Rose Cosmetics — Chardobato, Bhaktapur",
    description:
      "Skincare, haircare, makeup and fragrances from our Chardobato shop. Walk in or DM us; we courier across Nepal.",
    type: "website",
    siteName: "Rose Cosmetics",
  },
  alternates: { canonical: "/" },
};

// Rich LocalBusiness / Store schema. Google's local pack pulls
// `name`, `address`, `geo`, `openingHoursSpecification`, `priceRange`
// and `sameAs` straight from this — same shape as /contact so both
// pages reinforce a single business entity instead of competing.
// `image` resolves to /opengraph-image which Next generates from
// src/app/opengraph-image.tsx.
const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "Store",
  "@id": "https://rosecosmetics.live/#store",
  name: "Rose Cosmetics",
  description:
    "Family cosmetics shop in Chardobato, Bhaktapur. Skincare, haircare, makeup, fragrances and everyday essentials. We courier anywhere in Nepal.",
  url: "https://rosecosmetics.live",
  image: "https://rosecosmetics.live/opengraph-image",
  priceRange: "Rs 100 – Rs 5000",
  currenciesAccepted: "NPR",
  paymentAccepted: "Cash, eSewa, Khalti, Bank transfer",
  areaServed: { "@type": "Country", name: "Nepal" },
  hasMap: "https://maps.app.goo.gl/dJPHLJYKXZct8nxg7",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Chardobato",
    addressLocality: "Bhaktapur",
    addressRegion: "Bagmati",
    addressCountry: "NP",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 27.672335286219344,
    longitude: 85.37844546962677,
  },
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ],
    opens: "09:00",
    closes: "20:00",
  },
  sameAs: [
    "https://instagram.com/rose.cosmetics67",
    "https://tiktok.com/@rose.cosmetic83",
  ],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
      />

      {/* HERO ----------------------------------------------------------- */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute -left-32 -top-16 h-72 w-72 rounded-full bg-rose-200/55 blur-3xl sm:h-[28rem] sm:w-[28rem]"
        />
        <div
          aria-hidden
          className="absolute -right-24 top-24 h-72 w-72 rounded-full bg-rose-300/45 blur-3xl sm:top-32 sm:h-[26rem] sm:w-[26rem]"
        />
        <div className="relative mx-auto grid max-w-6xl gap-8 px-4 pb-10 pt-12 sm:gap-12 sm:px-6 sm:pb-20 sm:pt-28 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-rose-600 sm:text-sm">
              Chardobato · Bhaktapur
            </p>
            <h1 className="mt-2 font-[Allura,cursive] text-5xl leading-none text-rose-600 drop-shadow-sm xs:text-6xl sm:mt-3 sm:text-7xl">
              <span className="notranslate" translate="no">
                Rose Cosmetics
              </span>
            </h1>
            <p className="mt-3 text-xl font-medium text-stone-800 sm:text-3xl">
              The shelf you wish your friend was working at.
            </p>
            <p className="mt-4 max-w-prose text-[15px] leading-relaxed text-stone-700 sm:mt-5 sm:text-base">
              We&apos;re a small family shop in Chardobato stocking
              skincare, haircare, makeup, fragrances and the everyday
              essentials you actually reach for. Come browse in person,
              or message us on Instagram and TikTok — we courier across
              Nepal.
            </p>
            <div className="mt-6 grid gap-2 sm:mt-8 sm:flex sm:flex-wrap sm:gap-3">
              <Link
                href={"/shop" as Route}
                className="rounded-full bg-rose-600 px-6 py-3 text-center text-sm font-semibold text-white shadow-md shadow-rose-300/50 transition-transform hover:-translate-y-0.5 hover:bg-rose-500"
              >
                How to order
              </Link>
              <Link
                href={"/contact" as Route}
                className="rounded-full border border-rose-600 px-6 py-3 text-center text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50"
              >
                Find the shop
              </Link>
            </div>
          </div>

          {/* Hero visual — no card edges. Just a soft round glow with the
              monogram floating on it. Smaller on mobile so the headline
              doesn't get pushed below the fold. */}
          <div className="relative flex items-center justify-center">
            <div
              aria-hidden
              className="absolute inset-0 mx-auto h-56 w-56 rounded-full bg-gradient-to-br from-rose-100 via-rose-50 to-rose-200 blur-2xl sm:h-80 sm:w-80"
            />
            <div className="relative flex flex-col items-center">
              <p
                className="font-[Allura,cursive] text-[8rem] leading-none text-rose-500/90 sm:text-[12rem] md:text-[14rem]"
                aria-hidden
              >
                R
              </p>
              <p className="-mt-4 font-[Allura,cursive] text-3xl text-stone-800 sm:-mt-6 sm:text-4xl md:text-5xl">
                your favourite shade
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES ------------------------------------------------------- */}
      <section className="border-t border-stone-200/70 bg-white py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-semibold text-stone-800 sm:text-4xl">
            What you&apos;ll find with us
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-stone-600 sm:text-base">
            Small shelves, careful picks, honest opinions.
          </p>
          <div className="mt-8 grid gap-5 sm:mt-12 sm:gap-8 md:grid-cols-3">
            <Feature
              title="A small, careful range"
              body="We stock what we actually use. Cleansers that don't strip your skin, shampoos that don't dry your scalp, perfumes that hold past lunch. If a product disappoints us once, it&apos;s off the shelf."
            />
            <Feature
              title="Honest matching"
              body="Tell us your skin, your budget, the look you're going for. We'll point you at the right tube — even the cheap one. We&apos;d rather see you next month than oversell you once."
            />
            <Feature
              title="Couriers across Nepal"
              body="Most of our customers find us on Instagram or TikTok. Send your address and the products you want; we pack the same day and you get a private tracking link before it leaves the shop."
            />
          </div>
        </div>
      </section>

      {/* STORY ---------------------------------------------------------- */}
      <section className="bg-rose-50/50 py-14 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:gap-10 sm:px-6 md:grid-cols-[1fr_2fr] md:items-center">
          <p className="font-[Allura,cursive] text-6xl leading-none text-rose-500 sm:text-7xl">
            Hi 👋
          </p>
          <div>
            <h2 className="text-xl font-semibold text-stone-800 sm:text-3xl">
              A little corner shop in Chardobato.
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-stone-700 sm:mt-4 sm:text-base">
              We opened <span className="notranslate" translate="no">Rose Cosmetics</span> because we wanted a beauty shop
              that felt like a friend&apos;s bathroom shelf — skincare,
              haircare, makeup and fragrances we&apos;d actually use
              ourselves. Come browse in person, or DM us a photo and
              we&apos;ll tell you what works.
            </p>
            <Link
              href={"/about" as Route}
              className="mt-4 inline-block text-sm font-semibold text-rose-600 hover:underline sm:mt-5"
            >
              Read more →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA ------------------------------------------------------------ */}
      <section className="bg-rose-600 py-12 text-center text-white sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="font-[Allura,cursive] text-4xl leading-none sm:text-6xl">
            Say hi?
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-rose-50 sm:mt-4 sm:text-base">
            Slide into our DMs or stop by the shop. Either works.
          </p>
          <div className="mt-6 grid gap-2 sm:mt-7 sm:flex sm:flex-wrap sm:justify-center sm:gap-3">
            <a
              href="https://instagram.com/rose.cosmetics67"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-rose-600 transition-transform hover:-translate-y-0.5"
            >
              Instagram
            </a>
            <a
              href="https://tiktok.com/@rose.cosmetic83"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white/80 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              TikTok
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-stone-200/70 bg-stone-50/60 p-6 shadow-sm transition-transform hover:-translate-y-1">
      <h3 className="text-lg font-semibold text-stone-800">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">{body}</p>
    </div>
  );
}
