import type { MetadataRoute } from "next";

const BASE_URL = "https://rosecosmetics.live";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/about", "/shop", "/store", "/contact"],
        // Staff portal and APIs should never be indexed.
        disallow: [
          "/gulabshop",
          "/dashboard",
          "/pos",
          "/sales",
          "/online",
          "/products",
          "/inventory",
          "/categories",
          "/suppliers",
          "/receiving",
          "/staff",
          "/audit",
          "/close",
          "/returns",
          "/reports",
          "/settings",
          "/chat",
          "/api/",
          "/track/",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
