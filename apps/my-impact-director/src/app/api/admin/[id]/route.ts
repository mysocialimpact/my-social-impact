import { z } from "zod";
import { founder } from "@/lib/auth";
import { query } from "@/lib/db";
import { AppError, failure, sameOrigin, readJson } from "@/lib/security";
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    sameOrigin(req);
    const user = await founder(req),
      id = z.uuid().parse((await ctx.params).id),
      data = z
        .object({ reason: z.string().trim().min(10).max(500) })
        .strict()
        .parse(await readJson(req));
    const [r] = await query(
      `SELECT v.result,v.status,r.title,r.pages FROM director.reviews v JOIN director.reports r ON r.id=v.report_id WHERE v.id=$1 AND (r.quality_consent=true OR EXISTS(SELECT 1 FROM director.enquiries e WHERE e.review_id=v.id AND e.share_review=true))`,
      [id],
    );
    if (!r)
      throw new AppError(
        403,
        "The owner has not consented to sharing the detailed review.",
      );
    await query(
      "INSERT INTO director.audit(actor_id,action,resource_id,reason) VALUES($1,$2,$3,$4)",
      [user.id, "inspect-review", id, data.reason],
    );
    return Response.json(r, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return failure(e);
  }
}
