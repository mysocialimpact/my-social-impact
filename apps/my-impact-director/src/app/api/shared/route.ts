import { readShare } from "@/lib/sharing";
import { sameOrigin, readJson, failure, rateLimit } from "@/lib/security";
import { privateNetworkKey } from "@/lib/access";
import { z } from "zod";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    await rateLimit(`shared-read:${privateNetworkKey(req)}`, 120, 3600);
    const data = z
      .object({ token: z.string().max(100) })
      .strict()
      .parse(await readJson(req));
    return Response.json(await readShare(data.token), {
      headers: {
        "cache-control": "private, no-store",
        "x-robots-tag": "noindex, nofollow, noarchive",
        "referrer-policy": "no-referrer",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
