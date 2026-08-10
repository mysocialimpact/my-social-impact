import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const source = "https://mysocialimpact.org/wp-json/wp/v2/posts?per_page=100&_embed=1";
const projectRoot = process.cwd();
const imageDirectory = path.join(projectRoot, "public", "blog", "archive");
const dataDirectory = path.join(projectRoot, "app", "blog");

const decode = (value = "") => value
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&quot;/g, '"')
  .replace(/&#(?:039|39);/g, "'")
  .replace(/&hellip;/g, "…")
  .replace(/&(?:rsquo|lsquo);/g, "’")
  .replace(/&(?:rdquo|ldquo);/g, '”')
  .replace(/&ndash;/g, "–")
  .replace(/&mdash;/g, "—")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">");

const plainText = (value = "") => decode(value)
  .replace(/<script[\s\S]*?<\/script>/gi, " ")
  .replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const extensionFor = (url, contentType = "") => {
  const pathname = new URL(url).pathname;
  const extension = path.extname(pathname).toLowerCase();
  if (/^\.(?:avif|gif|jpe?g|png|svg|webp)$/.test(extension)) return extension === ".jpeg" ? ".jpg" : extension;
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("webp")) return ".webp";
  if (contentType.includes("svg")) return ".svg";
  return ".jpg";
};

const downloadImage = async (url, basename) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  const extension = extensionFor(url, response.headers.get("content-type") ?? "");
  const filename = `${basename}${extension}`;
  await writeFile(path.join(imageDirectory, filename), Buffer.from(await response.arrayBuffer()));
  return `/blog/archive/${filename}`;
};

await mkdir(imageDirectory, { recursive: true });
await mkdir(dataDirectory, { recursive: true });

const response = await fetch(source);
if (!response.ok) throw new Error(`WordPress export failed with ${response.status}`);
const wordpressPosts = await response.json();
const knownSlugs = new Set(wordpressPosts.map((post) => post.slug));

const metadata = [];
const content = [];

for (const [postIndex, post] of wordpressPosts.entries()) {
  const title = decode(post.title.rendered);
  const categories = (post._embedded?.["wp:term"]?.flat() ?? [])
    .filter((term) => term.taxonomy === "category")
    .map((term) => decode(term.name));
  const featuredSource = post._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? null;
  let featuredImage = null;

  if (featuredSource) {
    try {
      featuredImage = await downloadImage(featuredSource, `${post.slug}-featured`);
    } catch (error) {
      console.warn(`Featured image skipped for ${post.slug}:`, error.message);
    }
  }

  let html = post.content.rendered
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\s(?:srcset|sizes|on\w+)=(?:"[^"]*"|'[^']*')/gi, "")
    .replace(/\sstyle=(?:"[^"]*"|'[^']*')/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "");

  const inlineSources = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)]
    .map((match) => match[1])
    .filter((url) => /^https?:\/\//.test(url));

  for (const [imageIndex, imageSource] of [...new Set(inlineSources)].entries()) {
    try {
      const localImage = await downloadImage(imageSource, `${post.slug}-inline-${imageIndex + 1}`);
      html = html.split(imageSource).join(localImage);
    } catch (error) {
      console.warn(`Inline image skipped for ${post.slug}:`, error.message);
      const escapedSource = imageSource.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      html = html.replace(new RegExp(`<img[^>]+src=["']${escapedSource}["'][^>]*>`, "gi"), "");
    }
  }

  html = html.replace(/href=["']https?:\/\/(?:www\.)?mysocialimpact\.org\/([^"'#?]*)[^"']*["']/gi, (match, pathname) => {
    const segments = pathname.split("/").filter(Boolean);
    const slug = segments.at(-1);
    if (slug && knownSlugs.has(slug)) return `href="/blog/${slug}"`;
    return segments.length === 0 ? 'href="/"' : match;
  });

  const excerptSource = (plainText(post.excerpt.rendered) || plainText(html))
    .replace(/\s*\[…\]\s*$/, "…")
    .trim();
  const excerpt = excerptSource.length > 235
    ? `${excerptSource.slice(0, excerptSource.lastIndexOf(" ", 232))}…`
    : excerptSource;
  const date = dateFormatter.format(new Date(`${post.date_gmt || post.date}Z`));
  const record = {
    slug: post.slug,
    date,
    dateISO: `${post.date.slice(0, 10)}T00:00:00.000Z`,
    title,
    excerpt,
    image: featuredImage,
    categories,
    category: categories.find((category) => category !== "Uncategorized") ?? categories[0] ?? "Insights",
    href: `/blog/${post.slug}`,
  };

  metadata.push(record);
  content.push({ ...record, html, legacyUrl: post.link });
  console.log(`[${postIndex + 1}/${wordpressPosts.length}] ${post.slug}`);
}

await writeFile(path.join(dataDirectory, "posts.json"), `${JSON.stringify(metadata, null, 2)}\n`);
await writeFile(path.join(dataDirectory, "content.json"), `${JSON.stringify(content, null, 2)}\n`);
console.log(`Migrated ${metadata.length} posts.`);
