import { z } from "zod";
import { identity } from "@/lib/auth";
import { query } from "@/lib/db";
import { getReview } from "@/lib/reviews";
import { sameOrigin, failure, rateLimit, readJson } from "@/lib/security";
const schema = z
  .object({
    service: z.enum(["expert-review", "preparation", "digitisation"]),
    message: z.string().trim().min(10).max(5000),
    reviewId: z.uuid().nullable(),
    shareReview: z.boolean(),
    contactConsent: z.literal(true),
  })
  .strict();
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const user = await identity(req);
    const data = schema.parse(await readJson(req));
    await rateLimit(`enquiry:${user.id}`, 5, 86400);
    if (data.reviewId) await getReview(user, data.reviewId);
    const [r] = await query(
      `INSERT INTO director.enquiries(owner_id,review_id,service,message,share_review) VALUES($1,$2,$3,$4,$5) RETURNING id`,
      [user.id, data.reviewId, data.service, data.message, data.shareReview],
    );
    return Response.json(r, { status: 201 });
  } catch (e) {
    return failure(e);
  }
}
