import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/reviews", "/admin", "/login", "/review", "/access"],
    },
    sitemap: "https://www.myimpactdirector.com/sitemap.xml",
  };
}
