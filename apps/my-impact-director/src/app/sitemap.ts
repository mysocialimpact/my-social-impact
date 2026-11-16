import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    "",
    "/methodology",
    "/methodology/impact-report-excellence",
    "/services",
    "/your-impact-director",
    "/services/expert-review",
    "/services/preparation",
    "/services/digitisation",
    "/privacy",
    "/terms",
  ].map((p) => ({ url: "https://www.myimpactdirector.com" + p }));
}
