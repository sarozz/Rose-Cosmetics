import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";

export const metadata: Metadata = {
  title: "Online store · Coming soon",
  description:
    "Rose Cosmetics' online store is on the way — browse skincare, haircare, makeup and fragrances and check out in one tap. For now, DM us on Instagram or TikTok.",
  alternates: { canonical: "/store" },
  openGraph: {
    title: "Online store — coming soon",
    description:
      "Rose Cosmetics' online store is in the works. DM us on Instagram or TikTok in the meantime.",
    type: "website",
  },
};

export default function StorePage() {
  return (
    <section className="relative overflow-hidden">
      {/* Soft decorative glows so the page doesn't feel empty. */}
      <div
        aria-hidden
        className="absolute -left-24 -top-16 h-72 w-72 rounded-full bg-rose-200/55 blur-3xl sm:-left-32 sm:-top-24 sm:h-[26rem] sm:w-[26rem]"
      />
      <div
        aria-hidden
        className="absolute -right-24 top-32 h-72 w-72 rounded-full bg-rose-300/45 blur-3xl sm:h-[24rem] sm:w-[24rem]"
      />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 py-16 text-center sm:px-6 sm:py-28">
        <span className="rounded-full border border-rose-300 bg-rose-50/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-rose-700">
          Coming soon
        </span>

        <h1 className="mt-5 font-[Allura,cursive] text-5xl leading-none text-rose-600 sm:text-7xl">
          Shop online
        </h1>

        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-stone-700 sm:mt-5 sm:text-lg">
          A proper online store is in the works — browse the shelf, pick
          your shades, check out in one tap. We&apos;re building it in our
          quieter hours, between packing today&apos;s orders.
        </p>

        <p className="mt-3 max-w-xl text-sm leading-relaxed text-stone-600 sm:text-base">
          Until it&apos;s live, message us on Instagram or TikTok — same
          shop, same shelf, same delivery anywhere in Nepal.
        </p>

        <div className="mt-8 grid w-full max-w-md gap-2 sm:mt-10 sm:flex sm:flex-wrap sm:justify-center sm:gap-3">
          <a
            href="https://instagram.com/rose.cosmetics67"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-rose-600 px-6 py-3 text-center text-sm font-semibold text-white shadow-md shadow-rose-300/40 transition-transform hover:-translate-y-0.5"
          >
            DM on Instagram
          </a>
          <a
            href="https://tiktok.com/@rose.cosmetic83"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-rose-600 px-6 py-3 text-center text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50"
          >
            DM on TikTok
          </a>
        </div>

        <p className="mt-12 text-xs uppercase tracking-widest text-stone-500">
          In the meantime
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-stone-700">
          <Link href={"/shop" as Route} className="hover:text-rose-600">
            How to order →
          </Link>
          <Link href={"/contact" as Route} className="hover:text-rose-600">
            Find the shop →
          </Link>
          <Link href={"/about" as Route} className="hover:text-rose-600">
            About us →
          </Link>
        </div>
      </div>
    </section>
  );
}
