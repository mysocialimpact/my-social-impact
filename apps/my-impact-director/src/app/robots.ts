import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/reviews", "/admin", "/login", "/review"],
    },
    sitemap: "https://myimpactdirector.com/sitemap.xml",
  };
}
