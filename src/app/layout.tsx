import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://rosecosmetics.live"),
  title: {
    default: "Rose Cosmetics · Pokhara, Nepal",
    template: "%s · Rose Cosmetics",
  },
  description:
    "Rose Cosmetics — a Pokhara-based beauty store. Hand-picked lipsticks, skincare, fragrances and small luxuries. Shop in-store or DM us on Instagram / TikTok and we deliver across Nepal.",
  keywords: [
    "Rose Cosmetics",
    "cosmetics Pokhara",
    "lipstick Nepal",
    "beauty store Pokhara",
    "skincare Nepal",
    "Instagram cosmetics Nepal",
  ],
  openGraph: {
    title: "Rose Cosmetics",
    description:
      "Pokhara's friendliest beauty store — lipsticks, skincare, fragrances and small luxuries. Delivery across Nepal.",
    type: "website",
    locale: "en_US",
    siteName: "Rose Cosmetics",
    url: "https://rosecosmetics.live",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rose Cosmetics",
    description:
      "Pokhara's friendliest beauty store. Shop in-store or DM us on Instagram / TikTok.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
