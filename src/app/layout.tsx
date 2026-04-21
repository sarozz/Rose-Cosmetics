import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rose Cosmetics POS",
  description:
    "Online-only, barcode-driven point-of-sale and inventory system for Rose Cosmetics.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white font-sans">{children}</body>
    </html>
  );
}
