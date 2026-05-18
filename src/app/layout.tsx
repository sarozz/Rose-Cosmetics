import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#FFF8F3",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://rosecosmetics.live"),
  title: {
    default: "Rose Cosmetics · Chardobato, Bhaktapur, Nepal",
    template: "%s · Rose Cosmetics",
  },
  description:
    "Rose Cosmetics — a Bhaktapur-based beauty store. Skincare, haircare, makeup, fragrances and everyday essentials. Shop in-store or DM us on Instagram / TikTok and we deliver across Nepal.",
  keywords: [
    "Rose Cosmetics",
    "cosmetics Bhaktapur",
    "skincare Nepal",
    "haircare Nepal",
    "makeup Nepal",
    "perfume Nepal",
    "beauty store Bhaktapur",
    "Instagram cosmetics Nepal",
  ],
  openGraph: {
    title: "Rose Cosmetics",
    description:
      "Bhaktapur's friendliest cosmetics shop — skincare, haircare, makeup, fragrances and everyday essentials. Delivery across Nepal.",
    type: "website",
    locale: "en_US",
    siteName: "Rose Cosmetics",
    url: "https://rosecosmetics.live",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rose Cosmetics",
    description:
      "Bhaktapur's friendliest cosmetics shop. Shop in-store or DM us on Instagram / TikTok.",
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
