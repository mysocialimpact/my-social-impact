import { MAX_FILE } from "./file-limits";
import { createHmac } from "node:crypto";
import { load } from "cheerio";
import { searchWeb } from "./ai";
import { publicFetch, publicUrl } from "./public-fetch";
import { validatePdf } from "./documents";
import { AppError, secretMatches } from "./security";
export type Candidate = {
  organisation: string;
  title: string;
  year: string | null;
  url: string;
  source: string;
  token: string;
  expires: number;
};
function signature(owner: string, url: string, expires: number) {
  if (!process.env.CRON_SECRET)
    throw new AppError(503, "Report discovery is unavailable.");
  return createHmac("sha256", process.env.CRON_SECRET)
    .update(JSON.stringify([owner, url, expires]))
    .digest("hex");
}
export function verifyCandidate(
  owner: string,
  c: { url: string; expires: number; token: string },
) {
  if (
    c.expires < Date.now() ||
    c.expires > Date.now() + 3600000 ||
    !secretMatches(c.token, signature(owner, c.url, c.expires))
  )
    throw new AppError(
      400,
      "This search result has expired. Please search again.",
    );
  publicUrl(c.url);
}
// Bound concurrency and total time without weakening per-source access checks.
async function mapSources<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const output: R[] = [];
  for (let i = 0; i < items.length; i += 3)
    output.push(...(await Promise.all(items.slice(i, i + 3).map(fn))));
  return output;
}
export async function discoverReports(
  owner: string,
  organisation: string,
): Promise<Candidate[]> {
  const citations = await searchWeb(organisation);
  const signal = AbortSignal.timeout(140000);
  type Found = { url: string; title: string; verified: boolean };
  const groups = await mapSources(
    citations.slice(0, 7),
    async (link): Promise<Found[]> => {
      try {
        const fetched = await publicFetch(link.url, MAX_FILE, 0, true, signal);
        if (fetched.status !== 200) return [];
        if (fetched.bytes.subarray(0, 5).toString() === "%PDF-") {
          validatePdf(fetched.bytes, "report.pdf");
          return [{ url: fetched.url, title: link.title, verified: true }];
        }
        if (!fetched.type.includes("html")) return [];
        const $ = load(fetched.bytes.toString()),
          found: Found[] = [];
        $("a[href]").each((_, a) => {
          try {
            const url = publicUrl(
              new URL($(a).attr("href")!, fetched.url).href,
            );
            const title = $(a).text().replace(/\s+/g, " ").trim();
            if (
              /\.pdf(?:$|\?)/i.test(url.href) &&
              /impact|annual|report|review|20\d{2}/i.test(title + url.pathname)
            )
              found.push({
                url: url.href,
                title: title || link.title,
                verified: false,
              });
          } catch {
            /* Exclude invalid links. */
          }
        });
        return found.slice(0, 8);
      } catch {
        return [];
      }
    },
  );
  const unique = [
    ...new Map(groups.flat().map((c) => [c.url, c])).values(),
  ].slice(0, 8);
  const verified = await mapSources(
    unique,
    async (c): Promise<Candidate | null> => {
      try {
        let url = c.url;
        if (!c.verified) {
          const f = await publicFetch(c.url, MAX_FILE, 0, true, signal);
          if (f.status !== 200) return null;
          validatePdf(f.bytes, "report.pdf");
          url = f.url;
        }
        const expires = Date.now() + 1800000;
        return {
          organisation,
          title: c.title.slice(0, 220),
          year:
            (c.title.match(/\b20\d{2}(?:[–/-]\d{2,4})?\b/) || [])[0] || null,
          url,
          source: new URL(url).hostname,
          expires,
          token: signature(owner, url, expires),
        };
      } catch {
        return null;
      }
    },
  );
  return [
    ...new Map(
      verified.filter((c): c is Candidate => c !== null).map((c) => [c.url, c]),
    ).values(),
  ];
}
