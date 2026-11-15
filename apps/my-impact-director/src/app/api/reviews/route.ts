import { privateNetworkKey } from "@/lib/access";
import { after } from "next/server";
import { visitor } from "@/lib/auth";
import { sameOrigin, failure, AppError, rateLimit } from "@/lib/security";
import { createReview, listReviews, ready } from "@/lib/reviews";
import { drain } from "@/lib/pipeline";
export const maxDuration = 300;
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    return Response.json(
      { reviews: await listReviews(await visitor(req)), enabled: ready() },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const user = await visitor(req);
    if (user.anonymous)
      await rateLimit(`anonymous-upload:${privateNetworkKey(req)}`, 3, 86400);
    await rateLimit(`upload:${user.id}`, 10, 3600);
    if (Number(req.headers.get("content-length") || 0) > 4_100_000)
      throw new AppError(413, "Choose a PDF up to 4 MB.");
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File))
      throw new AppError(400, "Choose a PDF to upload.");
    if (file.size > 4_000_000)
      throw new AppError(413, "Choose a PDF up to 4 MB.");
    const review = await createReview(
      user,
      Buffer.from(await file.arrayBuffer()),
      file.name,
      form.get("consent") === "true",
      form.get("qualityConsent") === "true",
    );
    after(() => drain(review.id));
    return Response.json(review, { status: 201 });
  } catch (e) {
    return failure(e);
  }
}
