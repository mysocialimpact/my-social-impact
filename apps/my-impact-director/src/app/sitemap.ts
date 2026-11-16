import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    "",
    "/contact",
    "/methodology",
    "/methodology/impact-report-excellence",
    "/services",
    "/services/expert-review",
    "/services/preparation",
    "/services/digitisation",
    "/privacy",
    "/terms",
  ].map((p) => ({ url: "https://www.myimpactdirector.com" + p }));
}
