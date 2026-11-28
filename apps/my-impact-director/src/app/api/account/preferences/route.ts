import { z } from "zod";
import { identity } from "@/lib/auth";
import { query } from "@/lib/db";
import { sameOrigin, readJson, failure, AppError } from "@/lib/security";
export async function GET(req: Request) {
  try {
    const user = await identity(req);
    const [preferences] = await query(
      "SELECT marketing_opt_in,marketing_recorded_at,last_auth_method FROM director.users WHERE id=$1",
      [user.id],
    );
    return Response.json(preferences, {
      headers: { "cache-control": "no-store" },
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const user = await identity(req);
    if (!user.emailVerified)
      throw new AppError(403, "Confirm ownership of your email first.");
    const data = z
      .object({ marketing: z.boolean() })
      .strict()
      .parse(await readJson(req));
    await query(
      "UPDATE director.users SET marketing_opt_in=$2,marketing_recorded_at=now(),marketing_wording_version='mid-2026-11',marketing_wording='Email me occasional My Impact Director news and services. I can unsubscribe at any time.',marketing_source='account-preferences' WHERE id=$1",
      [user.id, data.marketing],
    );
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
