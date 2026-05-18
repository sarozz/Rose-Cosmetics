import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";

export const metadata: Metadata = {
  title: "Rose Cosmetics · Beauty for everyday glow",
  description:
    "Rose Cosmetics is a Pokhara-based beauty store. Lipsticks, skincare, fragrances and more — shop in-store, on Instagram, or on TikTok. We ship across Nepal.",
  openGraph: {
    title: "Rose Cosmetics — beauty for everyday glow",
    description:
      "Pokhara's friendliest beauty store. Shop in person or order on Instagram / TikTok and we deliver across Nepal.",
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
    "Pokhara's friendliest beauty store. Lipsticks, skincare, fragrances and more.",
  url: "https://rosecosmetics.live",
  image: "https://rosecosmetics.live/og.png",
  address: { "@type": "PostalAddress", addressLocality: "Pokhara", addressCountry: "NP" },
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
          className="absolute -left-32 -top-24 h-96 w-96 rounded-full bg-rose-200/60 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -right-24 top-40 h-80 w-80 rounded-full bg-rose-300/50 blur-3xl"
        />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 sm:py-28 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-rose-600">
              Pokhara · Nepal
            </p>
            <h1 className="mt-3 font-[Allura,cursive] text-6xl leading-none text-rose-600 drop-shadow-sm sm:text-7xl">
              Rose Cosmetics
            </h1>
            <p className="mt-3 text-2xl font-medium text-stone-800 sm:text-3xl">
              Beauty made for your everyday glow.
            </p>
            <p className="mt-5 max-w-prose text-base leading-relaxed text-stone-600">
              Lipsticks, skincare, fragrances and small luxuries — hand-picked
              for the way you actually get ready. Walk into the store, or DM
              us on Instagram / TikTok and we&apos;ll deliver across Nepal.
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
                Visit the store
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-rose-200 via-rose-100 to-rose-300 shadow-2xl">
              <div className="absolute inset-0 flex items-center justify-center">
                <p
                  className="font-[Allura,cursive] text-[6rem] leading-none text-white/80 drop-shadow-md"
                  aria-hidden
                >
                  R
                </p>
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-rose-700/40 to-transparent p-6 text-center">
                <p className="font-[Allura,cursive] text-3xl text-white drop-shadow">
                  Your favorite shade
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES ------------------------------------------------------- */}
      <section className="border-t border-rose-100 bg-white py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-semibold text-stone-800 sm:text-4xl">
            Why people love Rose Cosmetics
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <Feature
              title="Hand-picked range"
              body="We carry brands we actually love — from drugstore favourites to harder-to-find scents. If it isn't good, we don't stock it."
            />
            <Feature
              title="Real advice"
              body="Tell us your skin type and the look you're after. We'll match you to something that works — no upsell, no pressure."
            />
            <Feature
              title="Nationwide delivery"
              body="DM us on Instagram or TikTok with your order and address. We pack it up and ship across Nepal — usually within 1–3 days."
            />
          </div>
        </div>
      </section>

      {/* STORY ---------------------------------------------------------- */}
      <section className="bg-rose-50/40 py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 md:grid-cols-[1fr_2fr] md:items-center">
          <p className="font-[Allura,cursive] text-7xl leading-none text-rose-500">
            Hi 👋
          </p>
          <div>
            <h2 className="text-2xl font-semibold text-stone-800 sm:text-3xl">
              Started in Pokhara, made for you.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-stone-600">
              Rose Cosmetics is a small family-run beauty store. Our shelves
              are stocked the way we&apos;d stock our own bathroom shelves —
              with things that genuinely make people feel good. Drop by and
              swatch in person, or message us and we&apos;ll send a few
              options to your phone.
            </p>
            <Link
              href={"/about" as Route}
              className="mt-5 inline-block text-sm font-semibold text-rose-600 hover:underline"
            >
              Read our story →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA ------------------------------------------------------------ */}
      <section className="bg-rose-600 py-16 text-center text-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="font-[Allura,cursive] text-5xl leading-none sm:text-6xl">
            Ready to glow?
          </h2>
          <p className="mt-4 text-base leading-relaxed text-rose-50">
            Slide into our DMs or stop by — we&apos;d love to meet you.
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
    <div className="rounded-2xl border border-rose-100 bg-cream/50 p-6 shadow-sm transition-transform hover:-translate-y-1">
      <h3 className="text-lg font-semibold text-stone-800">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">{body}</p>
    </div>
  );
}
