import { sendPendingReports } from "@/lib/report-delivery";
import { emailEnabled } from "@/lib/email-save";
import { z } from "zod";
import { query } from "@/lib/db";
import { readJson } from "@/lib/security";
import { after } from "next/server";
import { visitor, assertReviewAccount } from "@/lib/auth";
import {
  getReview,
  retryReview,
  deleteReview,
  startFramework,
  reviewAccess,
} from "@/lib/reviews";
import { failure, sameOrigin, rateLimit } from "@/lib/security";
import { drain } from "@/lib/pipeline";
export const maxDuration = 300;
type Context = { params: Promise<{ id: string }> };
export async function GET(req: Request, ctx: Context) {
  try {
    const user = await visitor(req);
    const r = await getReview(user, (await ctx.params).id);
    const full = await reviewAccess(user, r);
    const { lease_token, engine_state, ...safe } = r;
    void lease_token;
    void engine_state;
    const siblings = r.framework
      ? await query(
          "SELECT id,framework,version,status,COALESCE(jsonb_typeof(result->'scores'->framework)='object',false) AS has_result FROM director.reviews WHERE report_id=$1 AND framework IN ('claims','excellence','report') ORDER BY created_at DESC",
          [r.report_id],
        )
      : [];
    if (!full) {
      delete safe.findings;
      delete safe.extraction_notes;
      delete safe.claims;
      safe.pages = null;
      if (safe.result) {
        const result = structuredClone(
          safe.result,
        ) as import("@/lib/pipeline").ReviewResult;
        for (const score of Object.values(result.scores))
          for (const p of score!.principles) p.tests = [];
        result.claims = [];
        delete result.creativeDirection;
        delete result.pdfChecks;
        delete result.qualityControl;
        delete result.readerInspection;
        result.visualFirstImpression =
          result.artDirector?.review.firstImpression;
        delete result.artDirector;
        if (result.visualInspection) result.visualInspection.observations = [];
        result.actions.actions = result.actions.actions.slice(0, 3);
        result.actions.strengths = result.actions.strengths.slice(0, 3);
        result.actions.opportunities = result.actions.opportunities.slice(0, 3);
        safe.result = result;
      }
    }
    const [ingestion] = r.framework
      ? await query(
          "SELECT id,status,error_message FROM director.reviews WHERE report_id=$1 AND framework='document'",
          [r.report_id],
        )
      : [];
    const [delivery] = full
      ? await query(
          "SELECT CASE WHEN delivered_at IS NOT NULL THEN 'accepted' WHEN attempts>=8 AND (lease_until IS NULL OR lease_until<now()) THEN 'failed' ELSE 'pending' END AS state,attempts FROM director.report_deliveries WHERE review_id=$1 AND owner_id=ANY($2::text[])",
          [r.id, user.accessIds || [user.id]],
        )
      : [];
    return Response.json(
      {
        ...safe,
        full,
        siblings,
        ingestion,
        delivery,
        emailEnabled: emailEnabled(),
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
    const id = (await ctx.params).id;
    const user = await visitor(req);
    const data = req.headers.get("content-type")?.includes("application/json")
      ? await readJson(req)
      : {};
    if (data.action === "retry-delivery") {
      const review = await getReview(user, id);
      if (!(await reviewAccess(user, review)))
        return Response.json(
          { error: "Confirm your email first." },
          { status: 403 },
        );
      await rateLimit(`delivery-retry:${user.id}`, 3, 86400);
      await query(
        "UPDATE director.report_deliveries SET attempts=LEAST(attempts,7),next_attempt_at=now() WHERE review_id=$1 AND owner_id=ANY($2::text[]) AND delivered_at IS NULL AND (lease_until IS NULL OR lease_until<now())",
        [id, user.accessIds || [user.id]],
      );
      after(() => sendPendingReports());
      return Response.json({ ok: true });
    }
    if (data.action === "snapshot") {
      const review = await getReview(user, id);
      if (review.status === "complete" && review.result) {
        const viewed = await query(
          "UPDATE director.reviews SET first_viewed_at=now() WHERE id=$1 AND first_viewed_at IS NULL RETURNING id",
          [id],
        );
        if (viewed.length)
          await query(
            "INSERT INTO director.daily_metrics(event,count) VALUES('snapshot_viewed',1) ON CONFLICT(day,event) DO UPDATE SET count=daily_metrics.count+1",
          );
      }
      return Response.json({ ok: true });
    }
    if (data.framework) {
      assertReviewAccount(user);
      const framework = z
        .enum(["claims", "excellence", "report"])
        .parse(data.framework);
      const review = await startFramework(user, id, framework);
      after(async () => {
        await drain(id);
        await drain(review.id);
      });
      return Response.json(review, { status: 201 });
    }
    assertReviewAccount(user);
    await retryReview(user, id);
    after(() => drain(id));
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(req: Request, ctx: Context) {
  try {
    sameOrigin(req);
    await deleteReview(await visitor(req), (await ctx.params).id);
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
