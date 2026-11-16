import { z } from "zod";
import { visitor } from "@/lib/auth";
import { metric, privateNetworkKey } from "@/lib/access";
import { query } from "@/lib/db";
import { sameOrigin, failure, rateLimit, readJson } from "@/lib/security";
const schema = z
  .object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().max(3000),
    page: z
      .string()
      .max(200)
      .regex(/^\/(?!\/)[^?#\\\s]*$/),
  })
  .strict();
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const user = await visitor(req);
    const data = schema.parse(await readJson(req));
    await rateLimit(`feedback-network:${privateNetworkKey(req)}`, 10, 86400);
    await rateLimit(`feedback:${user.id}`, 5, 86400);
    const [row] = await query(
      `INSERT INTO director.enquiries(owner_id,service,message,share_review,contact_name,contact_email) VALUES($1,'feedback',$2,false,'Anonymous feedback','') RETURNING id`,
      [
        user.id,
        `Usefulness: ${data.rating}/5\nPage: ${data.page}\n\n${data.comment || "No additional comment."}`,
      ],
    );
    await metric("feedback_created");
    return Response.json(row, { status: 201 });
  } catch (e) {
    return failure(e);
  }
}
