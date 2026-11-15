import { privateNetworkKey } from "@/lib/access";
import { z } from "zod";
import { after } from "next/server";
import { visitor } from "@/lib/auth";
import {
  AppError,
  failure,
  rateLimit,
  sameOrigin,
  readJson,
} from "@/lib/security";
import { discoverReports, verifyCandidate } from "@/lib/discovery";
import { publicFetch } from "@/lib/public-fetch";
import { createReview, ready } from "@/lib/reviews";
import { drain } from "@/lib/pipeline";
export const maxDuration = 300;
const schema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("search"),
      organisation: z.string().trim().min(2).max(160),
    })
    .strict(),
  z
    .object({
      action: z.literal("confirm"),
      url: z.url().max(3000),
      token: z.string().length(64),
      expires: z.number(),
      consent: z.boolean(),
      qualityConsent: z.boolean(),
    })
    .strict(),
]);
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const user = await visitor(req);
    if (!ready())
      throw new AppError(
        503,
        "Reviews are not open yet while live validation is completed.",
      );
    const input = schema.parse(await readJson(req));
    if (input.action === "search") {
      if (user.anonymous)
        await rateLimit(`anonymous-search:${privateNetworkKey(req)}`, 5, 86400);
      await rateLimit(`search:${user.id}`, 5, 86400);
      await rateLimit("search:global", 200, 86400);
      return Response.json({
        candidates: await discoverReports(user.id, input.organisation),
      });
    }
    verifyCandidate(user.id, input);
    if (user.anonymous)
      await rateLimit(`anonymous-upload:${privateNetworkKey(req)}`, 3, 86400);
    await rateLimit(`retrieve:${user.id}`, 10, 3600);
    const f = await publicFetch(input.url);
    if (f.status !== 200)
      throw new AppError(
        422,
        "This report cannot currently be retrieved. Please upload it instead.",
      );
    const r = await createReview(
      user,
      f.bytes,
      "Published impact report.pdf",
      input.consent,
      input.qualityConsent,
      f.url,
    );
    after(() => drain(r.id));
    return Response.json(r, { status: 201 });
  } catch (e) {
    return failure(e);
  }
}
