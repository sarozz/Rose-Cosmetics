import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact · Rose Cosmetics",
  description:
    "Visit Rose Cosmetics in Chardobato, Bhaktapur, Nepal. Open daily 9 AM – 8 PM. Find us on Google Maps, Instagram @rose.cosmetics67, or TikTok @rosecosmetic83.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact Rose Cosmetics",
    description: "Find the Chardobato store, opening hours, and our socials.",
    type: "website",
  },
};

const MAP_URL = "https://maps.app.goo.gl/dJPHLJYKXZct8nxg7";
// Google Maps embed for the same pin. Using the public q= search format
// so we don't depend on an API key. Querying the location string the
// owner registered the store under.
const MAP_EMBED_SRC =
  "https://www.google.com/maps?q=Rose+Cosmetics+Chardobato+Bhaktapur&output=embed";

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "Store",
  name: "Rose Cosmetics",
  url: "https://rosecosmetics.live/contact",
  hasMap: MAP_URL,
  address: {
    "@type": "PostalAddress",
    streetAddress: "Chardobato",
    addressLocality: "Bhaktapur",
    addressCountry: "NP",
  },
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    opens: "09:00",
    closes: "20:00",
  },
  sameAs: [
    "https://instagram.com/rose.cosmetics67",
    "https://tiktok.com/@rosecosmetic83",
  ],
};

export default function ContactPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
      />

      <section className="relative overflow-hidden">
        <div className="relative mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-24">
          <p className="text-xs font-semibold uppercase tracking-widest text-rose-600 sm:text-sm">
            Visit
          </p>
          <h1 className="mt-2 font-[Allura,cursive] text-5xl leading-none text-rose-600 sm:mt-3 sm:text-7xl">
            Come say hi.
          </h1>
          <p className="mt-4 max-w-prose text-[15px] leading-relaxed text-stone-700 sm:mt-5 sm:text-lg">
            We&apos;re in Chardobato, Bhaktapur. Swatch a lipstick, sniff
            a perfume, ask us anything — or message us and we&apos;ll help
            from your phone.
          </p>
        </div>
      </section>

      <section className="bg-white pb-14 sm:pb-20">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:gap-8 sm:px-6 md:grid-cols-2 md:items-start">
          {/* MAP --------------------------------------------------------- */}
          <div className="overflow-hidden rounded-3xl border border-stone-200/70 bg-cream shadow-md">
            <iframe
              title="Rose Cosmetics on Google Maps"
              src={MAP_EMBED_SRC}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="block h-72 w-full sm:h-[28rem]"
              allowFullScreen
            />
            <div className="border-t border-rose-100 p-4 text-center">
              <a
                href={MAP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-rose-600 hover:underline"
              >
                Open in Google Maps →
              </a>
            </div>
          </div>

          {/* DETAILS ----------------------------------------------------- */}
          <div className="space-y-7">
            <ContactBlock heading="Address">
              <p className="text-base leading-relaxed text-stone-700">
                Chardobato, Bhaktapur, Nepal
              </p>
              <a
                href={MAP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-sm font-semibold text-rose-600 hover:underline"
              >
                Get directions
              </a>
            </ContactBlock>

            <ContactBlock heading="Hours">
              <p className="text-base text-stone-700">
                Every day · 9 AM – 8 PM
              </p>
            </ContactBlock>

            <ContactBlock heading="Reach us online">
              <ul className="space-y-2 text-base text-stone-700">
                <li>
                  Instagram —{" "}
                  <a
                    href="https://instagram.com/rose.cosmetics67"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-rose-600 hover:underline"
                  >
                    @rose.cosmetics67
                  </a>
                </li>
                <li>
                  TikTok —{" "}
                  <a
                    href="https://tiktok.com/@rosecosmetic83"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-rose-600 hover:underline"
                  >
                    @rosecosmetic83
                  </a>
                </li>
              </ul>
            </ContactBlock>

            <ContactBlock heading="Delivery">
              <p className="text-base leading-relaxed text-stone-700">
                We courier anywhere in Nepal, usually within 1 to 3 days.
                Send us your order plus your address and we&apos;ll
                share a private tracking link the moment it leaves the
                shop.
              </p>
            </ContactBlock>
          </div>
        </div>
      </section>
    </>
  );
}

function ContactBlock({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-500">
        {heading}
      </h2>
      <div className="mt-2">{children}</div>
    </div>
  );
}
