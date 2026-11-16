import { visitor } from "@/lib/auth";
import { query } from "@/lib/db";
import { createShare, shareable } from "@/lib/sharing";
import { sameOrigin, readJson, failure, rateLimit } from "@/lib/security";
import { z } from "zod";
type Context = { params: Promise<{ id: string }> };
export async function GET(req: Request, ctx: Context) {
  try {
    const user = await visitor(req),
      id = z.uuid().parse((await ctx.params).id);
    await shareable(user, id);
    return Response.json(
      {
        shares: await query(
          "SELECT id,created_at,expires_at,revoked_at FROM director.assessment_shares WHERE review_id=$1 AND owner_id=$2 ORDER BY created_at DESC LIMIT 30",
          [id, user.id],
        ),
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request, ctx: Context) {
  try {
    sameOrigin(req);
    const user = await visitor(req),
      id = z.uuid().parse((await ctx.params).id);
    await rateLimit(`share:${user.id}`, 30, 3600);
    return Response.json(await createShare(user, id), {
      headers: { "cache-control": "no-store" },
    });
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(req: Request, ctx: Context) {
  try {
    sameOrigin(req);
    const user = await visitor(req),
      id = z.uuid().parse((await ctx.params).id);
    await shareable(user, id);
    const data = z
      .object({ id: z.uuid() })
      .strict()
      .parse(await readJson(req));
    await query(
      "UPDATE director.assessment_shares SET revoked_at=now() WHERE id=$1 AND review_id=$2 AND owner_id=$3",
      [data.id, id, user.id],
    );
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
