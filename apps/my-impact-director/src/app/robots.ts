import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/reviews",
        "/admin",
        "/login",
        "/review",
        "/access",
        "/register",
        "/account",
        "/verify-email",
        "/forgot-password",
        "/shared",
      ],
    },
    sitemap: "https://www.myimpactdirector.com/sitemap.xml",
  };
}
