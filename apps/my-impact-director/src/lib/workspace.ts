import { reportTotal } from "./report-total";
import type { ReviewResult } from "./pipeline";
import { query } from "./db";
import type { Identity } from "./auth";
import { AppError } from "./security";
export async function workspaces(user: Identity, reviewId?: string) {
  const rows = await query(
    `SELECT (SELECT jsonb_build_object('id',v.id,'scores',v.result->'scores') FROM director.reviews v WHERE v.report_id=r.id AND v.framework IS NULL AND v.status='complete' AND v.result IS NOT NULL ORDER BY v.created_at LIMIT 1) AS legacy,r.id,r.title,r.organisation,r.reporting_period,r.created_at,r.expires_at,
 (SELECT v.id FROM director.reviews v WHERE v.report_id=r.id ORDER BY (v.framework='document') DESC NULLS LAST,v.created_at LIMIT 1) AS root_id,
 true AS can_delete,
 EXISTS(SELECT 1 FROM director.review_grants g JOIN director.reviews v ON v.id=g.review_id WHERE v.report_id=r.id AND g.owner_id=ANY($1::text[])) AS full,
 COALESCE((SELECT jsonb_agg(jsonb_build_object('id',v.id,'framework',v.framework,'version',v.version,'status',v.status,'has_result',COALESCE(jsonb_typeof(v.result->'scores'->v.framework)='object',false), 'viewed',v.first_viewed_at IS NOT NULL,
 'publication',CASE WHEN v.framework='report' AND v.status='complete' THEN jsonb_build_object(
 'version',v.result->'version',
 'qualityControl',jsonb_build_object('calculatedOverall',v.result#>'{qualityControl,calculatedOverall}'),
 'editorial',jsonb_build_object('scoreConsistency',v.result#>'{editorial,scoreConsistency}'),
 'artDirector',jsonb_build_object('requiredPages',v.result#>'{artDirector,requiredPages}'),
 'visualInspection',jsonb_build_object('pages',v.result#>'{visualInspection,pages}'),
 'scores',jsonb_build_object('report',jsonb_build_object(
 'overall',v.result#>'{scores,report,overall}','unroundedOverall',v.result#>'{scores,report,unroundedOverall}',
 'provisional',v.result#>'{scores,report,provisional}','coverage',v.result#>'{scores,report,coverage}',
 'principles',(SELECT jsonb_agg(jsonb_build_object('score',p->'score','coverage',p->'coverage')) FROM jsonb_array_elements(COALESCE(v.result#>'{scores,report,principles}','[]'::jsonb)) p)
 ))) ELSE NULL END,'score' ,v.result->'scores'->v.framework->'overall','delivery',(SELECT CASE WHEN d.delivered_at IS NOT NULL THEN 'accepted' WHEN d.attempts>=8 THEN 'failed' ELSE 'pending' END FROM director.report_deliveries d WHERE d.review_id=v.id AND d.owner_id=ANY($1::text[]) LIMIT 1)) ORDER BY v.created_at DESC) FROM director.reviews v WHERE v.report_id=r.id AND v.framework IN ('claims','excellence','report')),'[]') AS assessments
 FROM director.reports r WHERE r.expires_at>now() AND ($2::uuid IS NULL OR r.id=(SELECT report_id FROM director.reviews WHERE id=$2)) AND (r.owner_id=ANY($1::text[]) OR EXISTS(SELECT 1 FROM director.review_grants g JOIN director.reviews v ON v.id=g.review_id WHERE v.report_id=r.id AND g.owner_id=ANY($1::text[]))) ORDER BY r.created_at DESC LIMIT 50`,
    [user.accessIds || [user.id], reviewId || null],
  );
  if (reviewId && !rows.length)
    throw new AppError(
      404,
      "This workspace has expired or is unavailable to this account.",
    );
  for (const row of rows) {
    const legacy = row.legacy as {
      id: string;
      scores: Record<string, { overall: number | null }>;
    } | null;
    const assessments = row.assessments as {
      framework: string;
      score?: number | null;
      publication?: ReviewResult;
    }[];
    for (const assessment of assessments) {
      if (assessment.framework === "report" && assessment.publication)
        assessment.score = reportTotal(assessment.publication);
      delete assessment.publication;
    }
    if (legacy)
      for (const framework of ["claims", "excellence"])
        if (
          legacy.scores[framework] &&
          !assessments.some((a) => a.framework === framework)
        )
          assessments.push({
            id: legacy.id,
            framework,
            status: "complete",
            has_result: true,
            viewed: false,
            score: legacy.scores[framework].overall,
            delivery: null,
          } as never);
    if (legacy) row.full = true;
    delete row.legacy;
  }
  return rows;
}

export async function selectedWorkspace(user: Identity) {
  const rows = await workspaces(user);
  if (!rows.length) return null;
  const [selected] = await query<{ report_id: string }>(
    "SELECT report_id FROM director.workspace_selections WHERE owner_id=ANY($1::text[]) ORDER BY selected_at DESC LIMIT 1",
    [user.accessIds || [user.id]],
  );
  return rows.find((r) => r.id === selected?.report_id) || rows[0];
}
export async function selectWorkspace(user: Identity, reviewId: string) {
  // Authorisation happens before persistence; browser-supplied UUIDs grant no access.
  const [workspace] = await workspaces(user, reviewId);
  await query(
    "INSERT INTO director.workspace_selections(owner_id,report_id) VALUES($1,$2) ON CONFLICT(owner_id) DO UPDATE SET report_id=EXCLUDED.report_id,selected_at=now()",
    [user.id, workspace.id],
  );
  return workspace;
}
