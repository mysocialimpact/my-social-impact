import { z } from "zod";
import { activeServices, type Service } from "@/lib/services";
import { visitor } from "@/lib/auth";
import { metric, privateNetworkKey } from "@/lib/access";
import { query } from "@/lib/db";
import { getReview } from "@/lib/reviews";
import { sameOrigin, failure, rateLimit, readJson } from "@/lib/security";
const schema = z
  .object({
    service: z.enum(
      activeServices.map(([key]) => key) as [Service, ...Service[]],
    ),
    message: z.string().trim().min(10).max(5000),
    reviewId: z.uuid().nullable(),
    shareReview: z.boolean(),
    contactConsent: z.literal(true),
    name: z.string().trim().min(2).max(120).optional(),
    email: z.email().max(254).optional(),
  })
  .strict();
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const user = await visitor(req);
    const data = schema.parse(await readJson(req));
    if (user.anonymous && (!data.email || !data.name))
      return Response.json(
        { error: "Add your name and email so the team can respond." },
        { status: 400 },
      );
    await rateLimit(`enquiry-network:${privateNetworkKey(req)}`, 10, 86400);
    await rateLimit(`enquiry:${user.id}`, 5, 86400);
    if (data.reviewId) await getReview(user, data.reviewId);
    const [r] = await query(
      `INSERT INTO director.enquiries(owner_id,review_id,service,message,share_review,contact_name,contact_email) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [
        user.id,
        data.reviewId,
        data.service,
        data.message,
        data.shareReview,
        data.name || user.name,
        data.email || user.email,
      ],
    );
    await metric("enquiry_created");
    return Response.json(r, { status: 201 });
  } catch (e) {
    return failure(e);
  }
}
