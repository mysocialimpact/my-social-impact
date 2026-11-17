import { z } from "zod";
import { visitor } from "@/lib/auth";
import {
  contributionConfig,
  openContribution,
  supportSummary,
} from "@/lib/contributions";
import { failure, readJson, sameOrigin, rateLimit } from "@/lib/security";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    if (!contributionConfig().available)
      return Response.json(
        { available: false },
        { headers: { "cache-control": "no-store" } },
      );
    const review = z.uuid().parse(new URL(req.url).searchParams.get("review"));
    return Response.json(await supportSummary(await visitor(req), review), {
      headers: { "cache-control": "no-store" },
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const user = await visitor(req);
    const input = z
      .object({
        review: z.uuid(),
        amount: z.string().max(20),
        attempt: z.uuid(),
      })
      .strict()
      .parse(await readJson(req));
    await rateLimit(`support-open:${user.id}`, 20, 900);
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    await rateLimit(`support-open-ip:${ip}`, 30, 3600);
    return Response.json(await openContribution(user, input), {
      headers: { "cache-control": "no-store" },
    });
  } catch (e) {
    return failure(e);
  }
}
