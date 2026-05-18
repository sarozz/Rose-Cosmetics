import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";

export const metadata: Metadata = {
  title: "About · Rose Cosmetics",
  description:
    "Rose Cosmetics is a small family beauty store in Chardobato, Bhaktapur — lipsticks, perfumes and skincare we'd actually use ourselves. Walk in or DM us; we courier across Nepal.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Rose Cosmetics",
    description:
      "A family beauty store in Chardobato, Bhaktapur. We stock the things we'd buy ourselves.",
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
            Hi, we&apos;re Rose.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-stone-700">
            Rose Cosmetics is a small family shop in Chardobato, Bhaktapur.
            We opened it for one reason: we kept buying lipsticks that
            looked nothing like the photo online, and we figured we
            weren&apos;t the only ones. So we started stocking the
            kind of shelf we&apos;d want to walk up to ourselves.
          </p>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-3xl space-y-10 px-4 sm:px-6">
          <Block
            heading="Small, careful range"
            body="We don&apos;t stock everything. Each product earns its place — usually after one of us has carried it through a wedding, a long monsoon shift, or a long-haul flight. If it disappoints, it&apos;s off the shelf."
          />
          <Block
            heading="Honest answers"
            body="Tell us your skin, your budget, the look you&apos;re going for. We&apos;ll suggest what works, even if it&apos;s the cheaper tube. We&apos;d rather see you back next month than oversell you once."
          />
          <Block
            heading="Made for Nepal"
            body="Most of our customers find us on Instagram and TikTok and order from their phone. We courier across the country and send a private tracking link the moment the package leaves the shop."
          />
        </div>
      </section>

      <section className="bg-rose-50/50 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-semibold text-stone-800 sm:text-3xl">
            Come say hi?
          </h2>
          <p className="mt-3 text-base text-stone-600">
            Drop by in Chardobato or message us on Instagram — that&apos;s
            usually the fastest way.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
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
