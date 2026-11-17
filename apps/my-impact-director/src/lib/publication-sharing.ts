import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { query } from "./db";
import type { Identity } from "./auth";
import { AppError } from "./security";
import type { ReviewResult } from "./pipeline";

function signature(nonce: string) {
  if (!process.env.CRON_SECRET)
    throw new AppError(503, "Sharing is temporarily unavailable.");
  return createHmac("sha256", process.env.CRON_SECRET)
    .update("publication-link-v1:" + nonce)
    .digest("base64url");
}

export async function managePublication(
  user: Identity,
  reviewId: string,
  method: "GET" | "POST" | "DELETE",
) {
  if (user.anonymous || !user.emailVerified)
    throw new AppError(403, "Verify your account to manage sharing.");
  z.uuid().parse(reviewId);
  const [owned] = await query(
    `SELECT v.id FROM director.reviews v JOIN director.reports r ON r.id=v.report_id
    WHERE v.id=$1 AND r.expires_at>now() AND v.status='complete' AND v.framework IN ('claims','excellence','report')
    AND jsonb_typeof(v.result->'scores'->v.framework)='object'
    AND (r.owner_id=ANY($2::text[]) OR EXISTS (SELECT 1 FROM director.review_grants g JOIN director.reviews gv ON gv.id=g.review_id WHERE gv.report_id=r.id AND g.owner_id=ANY($2::text[])))`,
    [reviewId, user.accessIds || [user.id]],
  );
  if (!owned) throw new AppError(404, "This report is unavailable.");
  if (method === "DELETE") {
    await query("DELETE FROM director.publication_links WHERE review_id=$1", [
      reviewId,
    ]);
    return { path: null };
  }
  const [row] = await query<{ nonce: string }>(
    method === "POST"
      ? "INSERT INTO director.publication_links(review_id) VALUES ($1) ON CONFLICT(review_id) DO UPDATE SET review_id=excluded.review_id RETURNING nonce"
      : "SELECT nonce FROM director.publication_links WHERE review_id=$1",
    [reviewId],
  );
  return {
    path: row ? "/shared#" + row.nonce + "." + signature(row.nonce) : null,
  };
}

export async function readPublication(token: string, statusOnly: boolean) {
  const unavailable = () =>
    new AppError(
      404,
      "This sharing link is unavailable. Ask the report owner for a current link.",
    );
  const [nonce, mac, ...extra] = token.split(".");
  if (
    extra.length ||
    !z.uuid().safeParse(nonce).success ||
    !/^[\w-]{43}$/.test(mac || "") ||
    !timingSafeEqual(Buffer.from(mac), Buffer.from(signature(nonce)))
  )
    throw unavailable();
  const [row] = await query<{ result?: ReviewResult }>(
    `SELECT ${statusOnly ? "1" : "v.result"} FROM director.publication_links l
    JOIN director.reviews v ON v.id=l.review_id JOIN director.reports r ON r.id=v.report_id
    WHERE l.nonce=$1 AND r.expires_at>now() AND v.status='complete' AND v.framework IN ('claims','excellence','report')`,
    [nonce],
  );
  if (!row) throw unavailable();
  if (statusOnly) return { active: true };
  const r = row.result!;
  const f = r.framework;
  if (!f || !r.scores[f]) throw unavailable();
  // The reader receives the published assessment, without workspace identifiers, model traces, or source files.
  const report: ReviewResult = {
    visualFirstImpression:
      r.artDirector?.review.firstImpression ?? r.visualFirstImpression,
    framework: f,
    version: r.version,
    assessedAt: r.assessedAt,
    context: {
      title: r.context.title,
      organisation: r.context.organisation,
      reportingPeriod: r.context.reportingPeriod,
      activities: [],
      outcomes: [],
      beneficiaries: [],
      limitations: [],
      context: "",
    },
    scores: { [f]: r.scores[f] },
    actions: r.actions,
    limitations: r.limitations,
    claims: f === "claims" ? r.claims : [],
    beta: r.beta,
    publicationNotice: r.publicationNotice,
    editorial: r.editorial,
    rating: r.rating,
    pdfChecks: r.pdfChecks,
    creativeDirection: r.creativeDirection,
  };
  return { report };
}
