import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    "",
    "/methodology",
    "/services",
    "/services/expert-review",
    "/services/preparation",
    "/services/digitisation",
    "/privacy",
    "/terms",
  ].map((p) => ({ url: "https://myimpactdirector.com" + p }));
}
