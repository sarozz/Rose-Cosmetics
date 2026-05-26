import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import { RoseLogo } from "@/components/rose-logo";
import { LanguageToggle } from "./language-toggle";

/**
 * Public marketing site shell. Wraps the four customer-facing pages
 * (home, about, contact, shop) with a light, brand-forward header and
 * footer. Mobile-first sizing — most visitors find us on Instagram and
 * tap through on their phones. Desktop keeps the same overall design,
 * just with more breathing room.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-cream text-stone-800">
      <MarketingHeader />
      {/* pb-20 sm:pb-0 makes room for the floating mobile DM bar so it
          never covers the page's bottom content. */}
      <main className="pb-20 sm:pb-0">{children}</main>
      <MarketingFooter />
      <MobileDmBar />
    </div>
  );
}

const NAV: { href: Route; label: string }[] = [
  { href: "/" as Route, label: "Home" },
  { href: "/about" as Route, label: "About" },
  { href: "/shop" as Route, label: "Shop" },
  { href: "/store" as Route, label: "Online store" },
  { href: "/contact" as Route, label: "Contact" },
];

function MarketingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-stone-100/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5 sm:px-6 sm:py-4">
        <Link
          href={"/" as Route}
          className="inline-flex items-center gap-2 text-stone-900"
          aria-label="Rose Cosmetics — home"
        >
          {/* Smaller wordmark on phones — the header should stay slim so
              hero content gets the room. */}
          <span className="sm:hidden">
            <RoseLogo size="sm" />
          </span>
          <span className="hidden sm:inline-flex">
            <RoseLogo size="md" />
          </span>
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
        <div className="hidden sm:block">
          <LanguageToggle />
        </div>
        {/* No staff link in the public chrome. */}
      </div>
      {/* Mobile nav — flat row under the logo, with generous tap targets. */}
      <nav
        aria-label="Primary mobile"
        className="flex items-center justify-around border-t border-stone-200/80 px-2 py-2 text-xs sm:hidden"
      >
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-md px-3 py-1.5 font-medium text-stone-700 active:bg-stone-200/60"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {/* Mobile language toggle — a thin row below the nav. Keeps the
          primary nav uncluttered while the picker stays one tap away. */}
      <div className="flex justify-center border-t border-stone-200/60 px-4 py-2 sm:hidden">
        <LanguageToggle />
      </div>
    </header>
  );
}

/**
 * Mobile-only sticky bar at the bottom with two big tap targets — DM
 * Instagram or call. Most of our traffic is phones coming in from
 * social, and the most common action is "open Instagram". Surfacing it
 * persistently saves several taps.
 */
function MobileDmBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200/80 bg-stone-100/95 backdrop-blur sm:hidden">
      <div className="mx-auto flex max-w-6xl items-stretch gap-2 p-2">
        <a
          href="https://instagram.com/rose.cosmetics67"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-rose-300/40 active:translate-y-px"
        >
          <InstagramIcon /> DM on Instagram
        </a>
        <Link
          href={"/contact" as Route}
          className="flex items-center justify-center gap-2 rounded-xl border border-rose-600 px-4 py-3 text-sm font-semibold text-rose-600 active:translate-y-px"
        >
          <MapIcon /> Map
        </Link>
      </div>
    </div>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path
        d="M12 22s7-7.5 7-12a7 7 0 1 0-14 0c0 4.5 7 12 7 12Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function MarketingFooter() {
  return (
    <footer className="border-t border-stone-200/80 bg-white/60">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 sm:py-12 md:grid-cols-3">
        <div className="text-stone-900">
          <RoseLogo size="md" />
          <p className="mt-3 max-w-xs text-sm text-stone-600">
            Skincare, haircare, makeup and everyday essentials from
            our Chardobato shop. Drop by, or DM us on Instagram and
            TikTok — we courier across Nepal.
          </p>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-500">
            Visit
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-stone-700">
            Chardobato, Bhaktapur, Nepal
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
                href="https://tiktok.com/@rose.cosmetic83"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-rose-600"
              >
                TikTok · @rose.cosmetic83
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
      <div className="border-t border-stone-200/60 py-4">
        <p className="text-center text-xs text-stone-500">
          © {new Date().getFullYear()} Rose Cosmetics · Chardobato, Bhaktapur, Nepal
        </p>
      </div>
    </footer>
  );
}
