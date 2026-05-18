import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";

export const metadata: Metadata = {
  title: "Rose Cosmetics · Beauty store in Chardobato, Bhaktapur",
  description:
    "Lipsticks, skincare, perfumes and small luxuries from Rose Cosmetics — a family beauty store in Chardobato, Bhaktapur. Walk in, or message us on Instagram or TikTok and we courier across Nepal.",
  openGraph: {
    title: "Rose Cosmetics — Chardobato, Bhaktapur",
    description:
      "Lipsticks, skincare and perfumes from our Chardobato shop. Walk in or DM us; we courier across Nepal.",
    type: "website",
    siteName: "Rose Cosmetics",
  },
  alternates: { canonical: "/" },
};

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "Store",
  name: "Rose Cosmetics",
  description:
    "Family beauty store in Chardobato, Bhaktapur. Lipsticks, skincare, perfumes and small luxuries.",
  url: "https://rosecosmetics.live",
  image: "https://rosecosmetics.live/og.png",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Chardobato",
    addressLocality: "Bhaktapur",
    addressCountry: "NP",
  },
  sameAs: [
    "https://instagram.com/rose.cosmetics67",
    "https://tiktok.com/@rosecosmetic83",
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
          className="absolute -left-32 -top-24 h-[28rem] w-[28rem] rounded-full bg-rose-200/55 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -right-32 top-32 h-[26rem] w-[26rem] rounded-full bg-rose-300/45 blur-3xl"
        />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 sm:py-28 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-rose-600">
              Chardobato · Bhaktapur
            </p>
            <h1 className="mt-3 font-[Allura,cursive] text-6xl leading-none text-rose-600 drop-shadow-sm sm:text-7xl">
              Rose Cosmetics
            </h1>
            <p className="mt-3 text-2xl font-medium text-stone-800 sm:text-3xl">
              The shelf you wish your friend was working at.
            </p>
            <p className="mt-5 max-w-prose text-base leading-relaxed text-stone-700">
              We&apos;re a small family shop in Chardobato selling
              lipsticks, perfumes, skincare and the odd thing we couldn&apos;t
              resist. Come swatch in person, or message us on Instagram
              and TikTok — we courier across Nepal.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={"/shop" as Route}
                className="rounded-full bg-rose-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-rose-300/50 transition-transform hover:-translate-y-0.5 hover:bg-rose-500"
              >
                How to order
              </Link>
              <Link
                href={"/contact" as Route}
                className="rounded-full border border-rose-600 px-6 py-3 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50"
              >
                Find the shop
              </Link>
            </div>
          </div>

          {/* Hero visual — no card edges. Just a soft round glow with the
              monogram floating on it, so it reads as part of the page rather
              than a UI element pasted on. */}
          <div className="relative flex items-center justify-center">
            <div
              aria-hidden
              className="absolute inset-0 mx-auto h-80 w-80 rounded-full bg-gradient-to-br from-rose-100 via-rose-50 to-rose-200 blur-2xl"
            />
            <div className="relative flex flex-col items-center">
              <p
                className="font-[Allura,cursive] text-[12rem] leading-none text-rose-500/90 sm:text-[14rem]"
                aria-hidden
              >
                R
              </p>
              <p className="-mt-6 font-[Allura,cursive] text-4xl text-stone-800 sm:text-5xl">
                your favourite shade
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES ------------------------------------------------------- */}
      <section className="border-t border-stone-200/70 bg-white py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-semibold text-stone-800 sm:text-4xl">
            What you&apos;ll find with us
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-base text-stone-600">
            Small shelves, careful picks, honest opinions.
          </p>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <Feature
              title="A small, careful range"
              body="We stock what we actually use. Drugstore lipsticks that don't bleed, perfumes that hold past lunch, skincare that earns its place. If it disappoints us once, it&apos;s off the shelf."
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
      <section className="bg-rose-50/50 py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 md:grid-cols-[1fr_2fr] md:items-center">
          <p className="font-[Allura,cursive] text-7xl leading-none text-rose-500">
            Hi 👋
          </p>
          <div>
            <h2 className="text-2xl font-semibold text-stone-800 sm:text-3xl">
              A little corner shop in Chardobato.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-stone-700">
              We opened Rose Cosmetics because we got tired of buying
              lipsticks that looked nothing like the photo. Everything on
              our shelves had to pass a family test first. Come in for a
              swatch, or DM us a photo — we&apos;ll tell you what works.
            </p>
            <Link
              href={"/about" as Route}
              className="mt-5 inline-block text-sm font-semibold text-rose-600 hover:underline"
            >
              Read more →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA ------------------------------------------------------------ */}
      <section className="bg-rose-600 py-16 text-center text-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="font-[Allura,cursive] text-5xl leading-none sm:text-6xl">
            Say hi?
          </h2>
          <p className="mt-4 text-base leading-relaxed text-rose-50">
            Slide into our DMs or stop by the shop. Either works.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <a
              href="https://instagram.com/rose.cosmetics67"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-rose-600 transition-transform hover:-translate-y-0.5"
            >
              Instagram
            </a>
            <a
              href="https://tiktok.com/@rosecosmetic83"
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
