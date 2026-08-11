import type { MetadataRoute } from "next";
import posts from "./blog/posts.json";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://mysocialimpact.org";
  return [
    { url: baseUrl, changeFrequency: "monthly", priority: 1 },
    { url: `${baseUrl}/social-impact-excellence`, changeFrequency: "monthly", priority: 0.95 },
    { url: `${baseUrl}/social-impact-report`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/social-impact-claims-code`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/blog`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/contact`, changeFrequency: "yearly", priority: 0.6 },
    ...posts.map((post) => ({
      url: `${baseUrl}${post.href}`,
      lastModified: post.dateISO,
      changeFrequency: "yearly" as const,
      priority: 0.7,
    })),
  ];
}
