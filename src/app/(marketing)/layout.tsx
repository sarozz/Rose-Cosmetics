import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import { RoseLogo } from "@/components/rose-logo";

/**
 * Public marketing site shell. Wraps the four customer-facing pages
 * (home, about, contact, shop) with a light, brand-forward header and
 * footer. The (app) staff portal uses its own dark layout — these two
 * shells never overlap.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-cream text-stone-800">
      <MarketingHeader />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}

const NAV: { href: Route; label: string }[] = [
  { href: "/" as Route, label: "Home" },
  { href: "/about" as Route, label: "About" },
  { href: "/shop" as Route, label: "Shop" },
  { href: "/contact" as Route, label: "Contact" },
];

function MarketingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-rose-200/60 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <Link
          href={"/" as Route}
          className="inline-flex items-center gap-2"
          aria-label="Rose Cosmetics — home"
        >
          <RoseLogo size="md" />
        </Link>
        <nav aria-label="Primary" className="hidden gap-7 text-sm sm:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="font-medium text-stone-700 transition-colors hover:text-rose-600"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          href={"/gulabshop" as Route}
          className="rounded-full border border-rose-600 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-rose-600 transition-colors hover:bg-rose-600 hover:text-white"
        >
          Staff
        </Link>
      </div>
      {/* Mobile nav — flat row under the logo. */}
      <nav
        aria-label="Primary mobile"
        className="flex items-center justify-center gap-6 border-t border-rose-200/60 px-4 py-2 text-xs sm:hidden"
      >
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="font-medium text-stone-700 hover:text-rose-600"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

function MarketingFooter() {
  return (
    <footer className="border-t border-rose-200/60 bg-white/60">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <RoseLogo size="md" />
          <p className="mt-3 max-w-xs text-sm text-stone-600">
            Cosmetics for everyday glow. Visit our shop, message us on
            Instagram or TikTok — we ship across Nepal.
          </p>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-500">
            Visit
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-stone-700">
            Pokhara, Nepal
            <br />
            Open daily · 9 AM – 8 PM
          </p>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-500">
            Find us
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-stone-700">
            <li>
              <a
                href="https://instagram.com/rose.cosmetics67"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-rose-600"
              >
                Instagram · @rose.cosmetics67
              </a>
            </li>
            <li>
              <a
                href="https://tiktok.com/@rosecosmetic83"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-rose-600"
              >
                TikTok · @rosecosmetic83
              </a>
            </li>
            <li>
              <Link
                href={"/contact" as Route}
                className="hover:text-rose-600"
              >
                Contact &amp; map
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-rose-200/40 py-4">
        <p className="text-center text-xs text-stone-500">
          © {new Date().getFullYear()} Rose Cosmetics · Pokhara, Nepal
        </p>
      </div>
    </footer>
  );
}
