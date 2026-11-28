import { z } from "zod";
import { founder } from "@/lib/auth";
import { query, transaction } from "@/lib/db";
import { AppError, failure, sameOrigin, readJson } from "@/lib/security";
const source = ` FROM director.feedback f LEFT JOIN director.feedback_mail m ON m.feedback_id=f.id AND m.kind='reply' `;
const summary = `count(*)::int AS total,count(rating)::int AS ratings,count(*) FILTER(WHERE comment<>'')::int AS comments,round(avg(rating),2) AS average,
 count(*) FILTER(WHERE human_attention)::int AS attention,count(*) FILTER(WHERE reply_consent)::int AS requested,
 count(*) FILTER(WHERE draft<>'' AND m.id IS NULL)::int AS drafted,count(*) FILTER(WHERE m.accepted_at IS NOT NULL)::int AS responded,
 count(*) FILTER(WHERE status='actioned')::int AS actioned,count(*) FILTER(WHERE status='resolved')::int AS resolved`;
export async function GET(req: Request) {
  try {
    await founder(req);
    const p = new URL(req.url).searchParams;
    const where = ` WHERE ($1='' OR f.rating::text=$1) AND ($2='' OR f.page=$2) AND ($3='' OR f.framework=$3)
   AND ($4='' OR (f.analysis->'categories') ? $4) AND ($5='' OR f.status=$5)
   AND ($6='' OR CASE $6 WHEN 'attention' THEN human_attention WHEN 'requested' THEN reply_consent WHEN 'drafted' THEN draft<>'' AND m.id IS NULL WHEN 'responded' THEN m.accepted_at IS NOT NULL ELSE NOT reply_consent END)`;
    const values = [
      "rating",
      "page",
      "framework",
      "category",
      "status",
      "response",
    ].map((k) => (p.get(k) || "").slice(0, 100));
    const offset = z.coerce
      .number()
      .int()
      .min(0)
      .max(10000000)
      .parse(p.get("offset") || 0);
    const [[metrics], items, trend, pages, frameworks, themes, [capability]] =
      await Promise.all([
        query("SELECT " + summary + source + where, values),
        query(
          `SELECT f.id,f.created_at,f.page,f.section,f.rating,f.comment,f.email,f.framework,f.methodology,f.models,f.review_id,f.signed_in,f.status,f.priority,f.decision,f.draft,f.revision,f.analysis_state,f.analysis,f.human_attention,m.state AS reply_state,m.accepted_at,n.state AS notification_state,
    (SELECT jsonb_agg(jsonb_build_object('actor',actor_id,'action',action,'reason',reason,'time',created_at) ORDER BY created_at DESC) FROM director.audit WHERE resource_id=f.id::text AND action LIKE 'feedback-%') AS history` +
            source +
            " LEFT JOIN director.feedback_mail n ON n.feedback_id=f.id AND n.kind='notification' " +
            where +
            " ORDER BY f.created_at DESC,f.id LIMIT 25 OFFSET $7",
          [...values, offset],
        ),
        query(
          "SELECT to_char(date_trunc('week',f.created_at AT TIME ZONE 'UTC'),'YYYY-MM-DD') AS label,round(avg(rating),2) AS average,count(rating)::int AS count" +
            source +
            where +
            " AND f.created_at>=now()-interval '12 weeks' AND rating IS NOT NULL GROUP BY 1 ORDER BY 1",
          values,
        ),
        query(
          "SELECT page AS label,count(*)::int AS count FROM director.feedback GROUP BY 1 ORDER BY 2 DESC",
        ),
        query(
          "SELECT framework AS label,count(*)::int AS count FROM director.feedback WHERE framework IS NOT NULL GROUP BY 1 ORDER BY 2 DESC",
        ),
        query(
          `SELECT f.analysis->>'theme' AS theme,category,count(*)::int AS count,(array_agg(f.analysis->>'summary' ORDER BY f.created_at DESC))[1] AS summary,(array_agg(f.analysis->>'improvement' ORDER BY f.created_at DESC))[1] AS improvement` +
            source +
            " CROSS JOIN LATERAL jsonb_array_elements_text(f.analysis->'categories') category " +
            where +
            " GROUP BY 1,2 ORDER BY count(*) DESC,1 LIMIT 15",
          values,
        ),
        query(
          "SELECT resource_id AS model,reason AS status,created_at AS checked FROM director.audit WHERE action='feedback-model-directory' ORDER BY created_at DESC LIMIT 1",
        ),
      ]);
    return Response.json(
      { metrics, items, trend, pages, frameworks, themes, capability },
      { headers: { "cache-control": "private,no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
const update = z
  .object({
    id: z.uuid(),
    revision: z.number().int().nonnegative(),
    status: z.enum(["new", "reviewed", "actioned", "resolved"]),
    priority: z.enum(["normal", "high", "urgent"]),
    decision: z.string().trim().max(1500),
    draft: z.string().trim().max(3000),
    action: z.enum(["save", "approve", "retry-analysis"]),
  })
  .strict();
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const actor = await founder(req),
      v = update.parse(await readJson(req, 24000));
    await transaction(async (c) => {
      const {
        rows: [f],
      } = await c.query(
        "SELECT * FROM director.feedback WHERE id=$1 FOR UPDATE",
        [v.id],
      );
      if (!f) throw new AppError(404, "Feedback unavailable.");
      if (f.revision !== v.revision)
        throw new AppError(
          409,
          "This item has changed. Reload it before saving.",
        );
      const {
        rows: [mail],
      } = await c.query(
        "SELECT id FROM director.feedback_mail WHERE feedback_id=$1 AND kind='reply'",
        [v.id],
      );
      if (mail && v.draft !== f.draft)
        throw new AppError(
          409,
          "The approved reply is already queued or sent.",
        );
      if (v.draft && !f.reply_consent)
        throw new AppError(400, "This visitor has not requested a reply.");
      if (v.action === "approve") {
        if (!v.draft || !f.reply_consent || !f.email || mail)
          throw new AppError(409, "This reply cannot be queued.");
        await c.query(
          "INSERT INTO director.feedback_mail(feedback_id,kind,recipient,body,approved_by) VALUES($1,'reply',$2,$3,$4)",
          [v.id, f.email, v.draft, actor.id],
        );
      }
      if (
        v.action === "retry-analysis" &&
        (!f.comment.trim() ||
          ["complete", "running", "pending", "skipped"].includes(
            f.analysis_state,
          ))
      )
        throw new AppError(409, "This analysis cannot be retried.");
      await c.query(
        `UPDATE director.feedback SET status=$2,priority=$3,decision=$4,draft=$5,revision=revision+1,human_attention=($2='new'),analysis_state=CASE WHEN $6='retry-analysis' THEN 'pending' ELSE analysis_state END,analysis_after=CASE WHEN $6='retry-analysis' THEN now() ELSE analysis_after END WHERE id=$1`,
        [v.id, v.status, v.priority, v.decision, v.draft, v.action],
      );
      await c.query(
        "INSERT INTO director.audit(actor_id,action,resource_id,reason) VALUES($1,$2,$3,$4)",
        [
          actor.id,
          "feedback-" + v.action,
          v.id,
          [v.status, v.priority, v.decision].filter(Boolean).join(" · "),
        ],
      );
    });
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
