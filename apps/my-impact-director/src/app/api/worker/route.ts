import { query } from "@/lib/db";
import { drain } from "@/lib/pipeline";
import { secretMatches } from "@/lib/security";
import { structured, AIError } from "@/lib/ai";
import { z } from "zod";
export const maxDuration = 300;
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  if (
    !secretMatches(
      req.headers.get("authorization") || "",
      `Bearer ${process.env.CRON_SECRET || ""}`,
    ) ||
    !process.env.CRON_SECRET
  )
    return Response.json({ error: "Unauthorised" }, { status: 401 });
  if (new URL(req.url).searchParams.get("check") === "ai") {
    try {
      const r = await structured(
        z.object({ ok: z.boolean() }).strict(),
        "Return ok true. This is a synthetic service connectivity check.",
        { test: true },
      );
      return Response.json({
        ok: r.data.ok,
        model: r.usage.model,
        cost: r.usage.cost,
      });
    } catch (e) {
      return Response.json(
        {
          ok: false,
          code: e instanceof AIError ? e.code : "AI_CHECK_FAILED",
          diagnostic: e instanceof AIError ? e.diagnostic : undefined,
        },
        { status: 503 },
      );
    }
  }
  await query("DELETE FROM director.reports WHERE expires_at<now()");
  await query(
    "DELETE FROM director.rate_limits WHERE reset_at<now()-interval '1 day'",
  );
  await drain();
  return Response.json({ ok: true });
}
