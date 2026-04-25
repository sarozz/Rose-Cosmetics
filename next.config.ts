import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      // Open Beauty Facts hosts product images on a few mirrors. Allowlisting
      // both the apex domain and the typical subdomains covers both the raw
      // API URLs and any CDN variants we've observed.
      { protocol: "https", hostname: "openbeautyfacts.org" },
      { protocol: "https", hostname: "world.openbeautyfacts.org" },
      { protocol: "https", hostname: "images.openbeautyfacts.org" },
      { protocol: "https", hostname: "static.openbeautyfacts.org" },
    ],
  },
};

export default nextConfig;
