import { createHash } from "node:crypto";
import { z } from "zod";
import { query, transaction } from "./db";
import { type Identity } from "./auth";
import { AppError, rateLimit } from "./security";
import { VERSION } from "./rubric";
import { metric } from "./access";
import { validatePdf } from "./documents";
export const idSchema = z.uuid();
export const ready = () => process.env.REVIEWS_ENABLED === "true";
export async function createReview(
  user: Identity,
  bytes: Buffer,
  title: string,
  consent: boolean,
  qualityConsent: boolean,
  sourceUrl: string | null = null,
  separate = false,
) {
  if (!ready())
    throw new AppError(
      503,
      "Reviews are not open yet while we finish live validation. Please check back soon.",
      "REVIEWS_PAUSED",
    );
  if (!consent)
    throw new AppError(
      400,
      "Please confirm you have permission to submit this report for AI processing.",
    );
  validatePdf(bytes, title);
  const version = separate ? VERSION + "-document" : VERSION;
  const sha = createHash("sha256").update(bytes).digest("hex");
  await query(
    "DELETE FROM director.reports WHERE owner_id=$1 AND sha256=$2 AND expires_at<=now()",
    [user.id, sha],
  );
  const [previous] = await query<{ id: string }>(
    `SELECT v.id FROM director.reports r JOIN director.reviews v ON v.report_id=r.id WHERE r.expires_at>now() AND (r.owner_id=ANY($1::text[]) OR EXISTS(SELECT 1 FROM director.review_grants g JOIN director.reviews gv ON gv.id=g.review_id WHERE gv.report_id=r.id AND g.owner_id=ANY($1::text[]))) AND r.sha256=$2 AND v.version=$3 ORDER BY r.created_at LIMIT 1`,
    [user.accessIds || [user.id], sha, version],
  );
  if (previous) {
    if (user.emailVerified && user.email)
      await transaction(async (c) => {
        await c.query(
          "SELECT r.id FROM director.reports r JOIN director.reviews v ON v.report_id=r.id WHERE v.id=$1 FOR UPDATE OF r",
          [previous.id],
        );
        await c.query(
          "INSERT INTO director.review_grants(review_id,owner_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
          [previous.id, user.id],
        );
        await c.query(
          "INSERT INTO director.report_subscriptions(report_id,owner_id,email) SELECT report_id,$2,$3 FROM director.reviews v WHERE id=$1 AND NOT EXISTS(SELECT 1 FROM director.report_subscriptions s WHERE s.report_id=v.report_id AND lower(s.email)=lower($3)) ON CONFLICT DO NOTHING",
          [previous.id, user.id, user.email],
        );
        await c.query(
          "UPDATE director.reports SET expires_at=GREATEST(expires_at,now()+interval '180 days') WHERE id=(SELECT report_id FROM director.reviews WHERE id=$1)",
          [previous.id],
        );
      });
    return previous;
  }
  return transaction(async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
      user.id,
    ]);
    // Recheck under the owner lock so simultaneous retries are idempotent.
    const {
      rows: [duplicate],
    } = await c.query<{ id: string }>(
      "SELECT v.id FROM director.reports r JOIN director.reviews v ON v.report_id=r.id WHERE r.owner_id=$1 AND r.sha256=$2 AND r.expires_at>now() AND v.version=$3",
      [user.id, sha, version],
    );
    if (duplicate) return duplicate;
    const {
      rows: [limits],
    } = await c.query(
      `SELECT count(*) AS total,
       (SELECT count(*) FROM director.completed_reports WHERE owner_id=$1 AND completed_at>now()-interval '24 hours') AS completed,
       count(*) FILTER(WHERE NOT EXISTS(SELECT 1 FROM director.completed_reports cr WHERE cr.report_id=r.id)
         AND EXISTS(SELECT 1 FROM director.reviews v WHERE v.report_id=r.id AND v.status IN ('queued','running') AND v.updated_at>now()-interval '1 hour')) AS active
       FROM director.reports r WHERE r.owner_id=$1 AND r.expires_at>now()`,
      [user.id],
    );
    if (Number(limits.total) >= 20)
      throw new AppError(
        429,
        "I’m sorry — your saved report storage is full. You can keep 20 reports; please delete an old report from My Reports to make space.",
        "REPORT_STORAGE_LIMIT",
      );
    if (Number(limits.completed) >= 3)
      throw new AppError(
        429,
        "I’m sorry — you’ve completed three free report reviews in the last 24 hours. Your existing reports are still available. Please return tomorrow, or use “Help make this better” if you need support.",
        "REVIEW_ALLOWANCE",
      );
    if (Number(limits.active) >= 3)
      throw new AppError(
        429,
        "I’m sorry — three of your reports are still being prepared. Please open My Reports to continue them, or try again when one has finished. Unfinished reviews haven’t used your daily allowance.",
        "REVIEWS_IN_PROGRESS",
        60,
      );
    const {
      rows: [report],
    } = await c.query(
      `INSERT INTO director.reports(owner_id,title,source_url,sha256,file_bytes,consent_version,quality_consent,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,now()+make_interval(days=>$8)) ON CONFLICT(owner_id,sha256) DO UPDATE SET title=reports.title RETURNING id`,
      [
        user.id,
        title.slice(0, 200),
        sourceUrl,
        sha,
        bytes,
        separate ? "privacy-3.0" : "privacy-2.0",
        qualityConsent,
        user.anonymous ? 7 : 180,
      ],
    );
    const {
      rows: [review],
    } = await c.query(
      `INSERT INTO director.reviews(report_id,version,framework,stage,status) SELECT $1,$2,$3,CASE WHEN $3='document' AND understanding_ready THEN 4 ELSE 0 END,CASE WHEN $3='document' AND understanding_ready THEN 'complete' ELSE 'queued' END FROM director.reports WHERE id=$1 ON CONFLICT(report_id,version) DO UPDATE SET version=reviews.version RETURNING id,(xmax=0) AS created`,
      [report.id, version, separate ? "document" : null],
    );
    if (review.created)
      await c.query(
        "INSERT INTO director.daily_metrics(event,count) VALUES('review_started',1) ON CONFLICT(day,event) DO UPDATE SET count=daily_metrics.count+1",
      );
    if (user.anonymous && review.created)
      await c.query(
        "INSERT INTO director.daily_metrics(event,count) VALUES('anonymous_started',1) ON CONFLICT(day,event) DO UPDATE SET count=daily_metrics.count+1",
      );
    if (user.emailVerified && user.email) {
      await c.query(
        "INSERT INTO director.review_grants(review_id,owner_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
        [review.id, user.id],
      );
      await c.query(
        "INSERT INTO director.report_subscriptions(report_id,owner_id,email) SELECT $1,$2,$3 WHERE NOT EXISTS(SELECT 1 FROM director.report_subscriptions WHERE report_id=$1 AND lower(email)=lower($3)) ON CONFLICT DO NOTHING",
        [report.id, user.id, user.email],
      );
      await c.query(
        "UPDATE director.reports SET expires_at=GREATEST(expires_at,now()+interval '180 days') WHERE id=$1",
        [report.id],
      );
    }
    return { id: review.id as string };
  });
}
export async function listReviews(user: Identity) {
  return query(
    `SELECT v.id,v.framework,v.status,v.stage,v.error_message,v.created_at,v.updated_at,r.title,r.organisation,r.reporting_period,r.source_url,v.result->'scores' AS scores FROM director.reviews v JOIN director.reports r ON r.id=v.report_id WHERE (v.framework IS NULL OR v.framework='document' OR NOT EXISTS(SELECT 1 FROM director.reviews dv WHERE dv.report_id=v.report_id AND dv.framework='document')) AND (r.owner_id=ANY($1::text[]) OR EXISTS(SELECT 1 FROM director.review_grants g WHERE (g.review_id=v.id OR (v.framework IS NOT NULL AND EXISTS(SELECT 1 FROM director.reviews gv WHERE gv.id=g.review_id AND gv.report_id=v.report_id))) AND g.owner_id=ANY($1::text[]))) AND r.expires_at>now() ORDER BY v.created_at DESC LIMIT 50`,
    [user.accessIds || [user.id]],
  );
}
export async function getReview(user: Identity, id: string) {
  idSchema.parse(id);
  const [row] = await query(
    `SELECT v.*,r.title,r.organisation,r.reporting_period,r.source_url,r.expires_at,r.pages,r.extraction_notes,r.quality_consent,r.understanding_ready,true AS can_delete FROM director.reviews v JOIN director.reports r ON r.id=v.report_id WHERE v.id=$1 AND (r.owner_id=ANY($2::text[]) OR EXISTS(SELECT 1 FROM director.review_grants g WHERE (g.review_id=v.id OR (v.framework IS NOT NULL AND EXISTS(SELECT 1 FROM director.reviews gv WHERE gv.id=g.review_id AND gv.report_id=v.report_id))) AND g.owner_id=ANY($2::text[]))) AND r.expires_at>now()`,
    [id, user.accessIds || [user.id]],
  );
  if (!row)
    throw new AppError(
      404,
      "This review has expired or is unavailable in this browser.",
    );
  if (row.status === "complete" && !row.framework && !row.first_viewed_at) {
    const viewed = await query(
      "UPDATE director.reviews SET first_viewed_at=now() WHERE id=$1 AND first_viewed_at IS NULL RETURNING id",
      [id],
    );
    if (viewed.length) await metric("result_viewed");
  }
  return row;
}
export async function retryReview(user: Identity, id: string) {
  await getReview(user, id);
  await rateLimit(`retry:${user.id}`, 3, 86400);
  await query(
    `UPDATE director.reviews SET status='queued',stage_attempts=0,next_attempt_at=now(),error_message=NULL,error_code=NULL,updated_at=now() WHERE id=$1 AND status='failed' AND attempts<50`,
    [id],
  );
}
export async function deleteReview(user: Identity, id: string) {
  const review = await getReview(user, id);
  if (!review.can_delete)
    throw new AppError(403, "Only the review owner can delete it.");
  await query(
    `DELETE FROM director.reports r USING director.reviews v WHERE v.report_id=r.id AND v.id=$1 AND (r.owner_id=ANY($2::text[]) OR EXISTS(SELECT 1 FROM director.review_grants g WHERE (g.review_id=v.id OR (v.framework IS NOT NULL AND EXISTS(SELECT 1 FROM director.reviews gv WHERE gv.id=g.review_id AND gv.report_id=v.report_id))) AND g.owner_id=ANY($2::text[])))`,
    [id, user.accessIds || [user.id]],
  );
}
export async function sourceFile(user: Identity, id: string) {
  idSchema.parse(id);
  const [r] = await query<{ file_bytes: Buffer }>(
    `SELECT r.file_bytes FROM director.reports r JOIN director.reviews v ON v.report_id=r.id WHERE v.id=$1 AND (r.owner_id=ANY($2::text[]) OR EXISTS(SELECT 1 FROM director.review_grants g WHERE (g.review_id=v.id OR (v.framework IS NOT NULL AND EXISTS(SELECT 1 FROM director.reviews gv WHERE gv.id=g.review_id AND gv.report_id=v.report_id))) AND g.owner_id=ANY($2::text[]))) AND r.expires_at>now()`,
    [id, user.accessIds || [user.id]],
  );
  if (!r) throw new AppError(404, "Report unavailable.");
  return r.file_bytes;
}

export async function startFramework(
  user: Identity,
  id: string,
  framework: "claims" | "excellence" | "report",
) {
  const parent = await getReview(user, id);
  const reportId = parent.report_id as string;
  if (!parent.framework && parent.status === "complete")
    await query(
      "UPDATE director.reports SET understanding_ready=true,understanding_context=$2,understanding_claims=$3 WHERE id=$1",
      [reportId, JSON.stringify(parent.context), JSON.stringify(parent.claims)],
    );
  const [review] = await query<{ id: string; created: boolean }>(
    `INSERT INTO director.reviews(report_id,version,framework,stage) VALUES($1,$2,$3,$4) ON CONFLICT(report_id,version) DO UPDATE SET version=reviews.version RETURNING id,(xmax=0) AS created`,
    [
      reportId,
      VERSION + "-" + framework,
      framework,
      framework === "report" ? 16 : framework === "claims" ? 4 : 9,
    ],
  );
  if (user.emailVerified && user.email) {
    await transaction(async (c) => {
      await c.query("SELECT id FROM director.reports WHERE id=$1 FOR UPDATE", [
        reportId,
      ]);
      await c.query(
        "INSERT INTO director.review_grants(review_id,owner_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
        [review.id, user.id],
      );
      await c.query(
        "UPDATE director.reports SET expires_at=GREATEST(expires_at,now()+interval '180 days') WHERE id=$1",
        [reportId],
      );
      await c.query(
        "INSERT INTO director.report_subscriptions(report_id,owner_id,email) SELECT $1,$2,$3 WHERE NOT EXISTS(SELECT 1 FROM director.report_subscriptions WHERE report_id=$1 AND lower(email)=lower($3)) ON CONFLICT DO NOTHING",
        [reportId, user.id, user.email],
      );
      await c.query(
        "INSERT INTO director.report_deliveries(review_id,owner_id,email) SELECT id,$2,$3 FROM director.reviews v WHERE id=$1 AND status='complete' AND result IS NOT NULL AND NOT EXISTS(SELECT 1 FROM director.report_deliveries d WHERE d.review_id=v.id AND lower(d.email)=lower($3)) ON CONFLICT DO NOTHING",
        [review.id, user.id, user.email],
      );
    });
  }
  if (review.created)
    await query(
      "INSERT INTO director.daily_metrics(event,count) VALUES($1,1) ON CONFLICT(day,event) DO UPDATE SET count=daily_metrics.count+1",
      ["selected_" + framework],
    );
  if (review.created)
    await query(
      "INSERT INTO director.daily_metrics(event,count) SELECT 'second_framework_selected',1 WHERE EXISTS(SELECT 1 FROM director.reviews WHERE report_id=$1 AND framework IN ('claims','excellence','report') AND framework<>$2) ON CONFLICT(day,event) DO UPDATE SET count=daily_metrics.count+1",
      [reportId, framework],
    );
  return review;
}
export async function reviewAccess(
  user: Identity,
  review: Record<string, unknown>,
) {
  if (!review.framework) return true;
  const rows = await query(
    "SELECT 1 FROM director.review_grants g JOIN director.reviews v ON v.id=g.review_id WHERE v.report_id=$1 AND g.owner_id=ANY($2::text[]) LIMIT 1",
    [review.report_id, user.accessIds || [user.id]],
  );
  return rows.length > 0;
}
