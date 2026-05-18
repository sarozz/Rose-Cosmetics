import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";

export const metadata: Metadata = {
  title: "About · Rose Cosmetics",
  description:
    "Rose Cosmetics is a family-run beauty store in Pokhara, Nepal. Hand-picked lipsticks, skincare, fragrances and small luxuries — with delivery across the country.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Rose Cosmetics",
    description:
      "A family-run beauty store in Pokhara, stocking what we'd stock in our own bathroom shelves.",
    type: "website",
  },
};

export default function AboutPage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute -right-32 -top-24 h-96 w-96 rounded-full bg-rose-200/60 blur-3xl"
        />
        <div className="relative mx-auto max-w-3xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="text-sm font-semibold uppercase tracking-widest text-rose-600">
            Our story
          </p>
          <h1 className="mt-3 font-[Allura,cursive] text-6xl leading-none text-rose-600 sm:text-7xl">
            Hello, we&apos;re Rose.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-stone-700">
            Rose Cosmetics started the way most good ideas do — with a small
            family in Pokhara who got tired of buying lipsticks that looked
            nothing like the photos online. So we opened a little corner
            shop, stocked with the things we&apos;d actually buy ourselves.
          </p>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-3xl space-y-10 px-4 sm:px-6">
          <Block
            heading="Hand-picked, never bulk-bought"
            body="Every product on our shelves passed the family test first. If it doesn't last on a long humid day, doesn't survive a quick wipe at the counter, or doesn't feel like quality in your hand, it doesn't make the cut."
          />
          <Block
            heading="Real advice over hard selling"
            body="Tell us your skin type, the look you're going for, your budget. We'll match you to something that works — even if it's our cheapest tube. We'd rather you come back next month than oversell you once."
          />
          <Block
            heading="Built for Nepal"
            body="Most of our customers find us on Instagram and TikTok, message us with what they want, and we ship across the country. We see ourselves as a friendly drop-in store first — and a phone-friendly one second."
          />
        </div>
      </section>

      <section className="bg-rose-50/40 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-semibold text-stone-800 sm:text-3xl">
            Want to say hi?
          </h2>
          <p className="mt-3 text-base text-stone-600">
            Drop by in person, or reach out on socials — we&apos;re usually
            quickest to reply on Instagram.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href={"/contact" as Route}
              className="rounded-full bg-rose-600 px-6 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
            >
              Find the store
            </Link>
            <a
              href="https://instagram.com/rose.cosmetics67"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-rose-600 px-6 py-3 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50"
            >
              DM us on Instagram
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
