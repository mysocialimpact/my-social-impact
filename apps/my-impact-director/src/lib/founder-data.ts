import { query } from "./db";
export const PAID_STATUS_SQL =
  "paid_at IS NOT NULL AND status IN ('succeeded','partially_refunded','refunded')";
export const accountScope = `WITH accounts AS (
 SELECT COALESCE(u.canonical_owner_id,u.id) AS id,min(u.created_at) AS created_at,max(u.last_seen) AS last_seen
 FROM director.users u JOIN director.users root ON root.id=COALESCE(u.canonical_owner_id,u.id)
 WHERE NOT u.is_anonymous AND u.account_class<>'test' AND root.retired_at IS NULL
 GROUP BY COALESCE(u.canonical_owner_id,u.id)
), scope AS (SELECT u.id,a.id AS account_id FROM director.users u JOIN accounts a ON a.id=COALESCE(u.canonical_owner_id,u.id) WHERE u.account_class<>'test')`;
export function funnelRates(counts: number[]) {
  return counts.map((count, i) => ({
    count,
    rate:
      i && counts[i - 1] > 0
        ? Math.round((count / counts[i - 1]) * 1000) / 10
        : null,
    dropoff: i ? Math.max(0, counts[i - 1] - count) : null,
  }));
}
export async function founderOverview() {
  const [metrics] = await query(`${accountScope} SELECT
 (SELECT count(*) FROM accounts) AS accounts,
 (SELECT count(*) FROM accounts WHERE created_at>=date_trunc('day',now() AT TIME ZONE 'Africa/Kampala') AT TIME ZONE 'Africa/Kampala') AS today,
 (SELECT count(*) FROM accounts WHERE created_at>=date_trunc('week',now() AT TIME ZONE 'Africa/Kampala') AT TIME ZONE 'Africa/Kampala') AS week,
 (SELECT count(*) FROM accounts WHERE created_at>=date_trunc('month',now() AT TIME ZONE 'Africa/Kampala') AT TIME ZONE 'Africa/Kampala') AS month,
 (SELECT count(*) FROM accounts WHERE last_seen>=now()-interval '30 days') AS active,
 (SELECT count(*) FROM director.reports r JOIN scope s ON s.id=r.owner_id) AS uploads,
 (SELECT count(*) FROM director.reviews v JOIN director.reports r ON r.id=v.report_id JOIN scope s ON s.id=r.owner_id WHERE v.framework IS DISTINCT FROM 'document') AS started,
 (SELECT count(*) FROM director.reviews v JOIN director.reports r ON r.id=v.report_id JOIN scope s ON s.id=r.owner_id WHERE v.framework IS DISTINCT FROM 'document' AND v.status='complete') AS completed,
 (SELECT count(*) FROM director.reviews v JOIN director.reports r ON r.id=v.report_id JOIN scope s ON s.id=r.owner_id WHERE v.framework IS DISTINCT FROM 'document' AND v.status='failed') AS failed,
 (SELECT count(*) FROM director.enquiries e JOIN scope s ON s.id=e.owner_id WHERE e.service<>'feedback') AS enquiries,
 (SELECT count(*) FROM director.enquiries e JOIN scope s ON s.id=e.owner_id WHERE e.converted_at IS NOT NULL AND e.service<>'feedback') AS conversions,
 (SELECT COALESCE(sum(cost_usd),0) FROM director.processing_events) AS ai_cost_usd,
 (SELECT COALESCE(sum(amount_pence) FILTER(WHERE ${PAID_STATUS_SQL}),0) FROM director.contributions WHERE livemode) AS gross_pence,
 (SELECT COALESCE(sum(refunded_pence) FILTER(WHERE ${PAID_STATUS_SQL}),0) FROM director.contributions WHERE livemode) AS refunded_pence,
 (SELECT count(*) FROM director.contributions WHERE livemode AND ${PAID_STATUS_SQL}) AS payments,
 (SELECT COALESCE(sum(count),0) FROM director.daily_metrics WHERE event='browser_session_started') AS visitor_sessions`);
  const frameworks = await query(
    `${accountScope} SELECT v.framework,count(*) FILTER(WHERE status='complete') AS completed,count(*) FILTER(WHERE status='failed') AS failed,count(*) FILTER(WHERE status IN ('queued','running')) AS preparing FROM director.reviews v JOIN director.reports r ON r.id=v.report_id JOIN scope s ON s.id=r.owner_id WHERE v.framework IN ('claims','excellence','report') GROUP BY v.framework`,
  );
  const [cohort] = await query(`${accountScope}, journey AS (
 SELECT a.id,min(r.created_at) AS uploaded,min(v.updated_at) FILTER(WHERE v.status='complete' AND v.framework IN ('claims','excellence','report')) AS completed,
 (SELECT min(e.created_at) FROM director.enquiries e JOIN scope es ON es.id=e.owner_id WHERE es.account_id=a.id AND e.service<>'feedback') AS enquired,
 (SELECT min(c.paid_at) FROM director.contributions c JOIN scope cs ON cs.id=c.owner_id WHERE cs.account_id=a.id AND c.livemode AND ${PAID_STATUS_SQL}) AS paid
 FROM accounts a LEFT JOIN scope s ON s.account_id=a.id LEFT JOIN director.reports r ON r.owner_id=s.id LEFT JOIN director.reviews v ON v.report_id=r.id GROUP BY a.id)
 SELECT count(*) AS registered,count(*) FILTER(WHERE uploaded IS NOT NULL) AS uploaded,
 count(*) FILTER(WHERE completed>=uploaded) AS completed,
 count(*) FILTER(WHERE enquired>=completed AND completed>=uploaded) AS enquired,
 count(*) FILTER(WHERE paid>=enquired AND enquired>=completed AND completed>=uploaded) AS paid FROM journey`);
  return {
    metrics,
    frameworks,
    funnel: funnelRates(
      [
        cohort.registered,
        cohort.uploaded,
        cohort.completed,
        cohort.enquired,
        cohort.paid,
      ].map(Number),
    ),
  };
}
export async function founderAccounts(q: string, page: number) {
  return query(
    `${accountScope} SELECT a.id,u.name,u.email,u.email_verified_at,u.organisation,a.created_at,a.last_seen,u.account_class,u.last_auth_method,
 (SELECT string_agg(DISTINCT aa."providerId",', ') FROM director.auth_accounts aa JOIN director.auth_principals p ON p.auth_user_id=aa."userId" WHERE p.owner_id=a.id) AS providers,
 (SELECT count(*) FROM director.reports r JOIN scope s ON s.id=r.owner_id WHERE s.account_id=a.id) AS reports,
 (SELECT count(*) FROM director.reviews v JOIN director.reports r ON r.id=v.report_id JOIN scope s ON s.id=r.owner_id WHERE s.account_id=a.id AND v.framework IS DISTINCT FROM 'document') AS assessments,
 (SELECT count(*) FROM director.enquiries e JOIN scope s ON s.id=e.owner_id WHERE s.account_id=a.id AND e.service<>'feedback') AS enquiries,
 (SELECT count(*) FROM director.contributions c JOIN scope s ON s.id=c.owner_id WHERE s.account_id=a.id AND c.livemode AND ${PAID_STATUS_SQL}) AS payments,
 (SELECT max(action) FROM director.audit l WHERE l.actor_id IN (SELECT id FROM scope WHERE account_id=a.id) AND l.created_at=(SELECT max(created_at) FROM director.audit WHERE actor_id IN(SELECT id FROM scope WHERE account_id=a.id))) AS latest_activity,
 count(*) OVER() AS total FROM accounts a JOIN director.users u ON u.id=a.id WHERE u.email ILIKE $1 OR u.name ILIKE $1 OR COALESCE(u.organisation,'') ILIKE $1 ORDER BY a.last_seen DESC LIMIT 30 OFFSET $2`,
    [`%${q}%`, (page - 1) * 30],
  );
}
export async function founderActivity(q: string, days: number) {
  return query(
    `WITH activity AS (
 SELECT u.created_at,'account-created' AS action,u.id AS actor_id,u.id AS resource,'Registered account' AS detail FROM director.users u WHERE NOT u.is_anonymous
 UNION ALL SELECT r.created_at,'report-uploaded' AS action,r.owner_id AS actor_id,r.id::text AS resource,r.title AS detail FROM director.reports r
 UNION ALL SELECT v.created_at,'review-started',r.owner_id,v.id::text,COALESCE(v.framework,'legacy') FROM director.reviews v JOIN director.reports r ON r.id=v.report_id WHERE v.framework IS DISTINCT FROM 'document'
 UNION ALL SELECT v.updated_at,'review-'||v.status,r.owner_id,v.id::text,COALESCE(v.framework,'legacy') FROM director.reviews v JOIN director.reports r ON r.id=v.report_id WHERE v.status IN ('complete','failed') AND v.framework IS DISTINCT FROM 'document'
 UNION ALL SELECT g.created_at,'report-saved',g.owner_id,g.review_id::text,'Private account access' FROM director.review_grants g
 UNION ALL SELECT a.created_at,a.action,a.actor_id,a.resource_id,'Account event' FROM director.audit a WHERE a.action NOT LIKE 'service-intent:%'
 UNION ALL SELECT e.created_at,'enquiry-created',e.owner_id,e.id::text,e.service FROM director.enquiries e WHERE e.service<>'feedback'
 UNION ALL SELECT c.paid_at,'contribution-received',c.owner_id,c.id::text,(CASE WHEN c.livemode THEN 'Live' ELSE 'Test' END)||' · '||(c.amount_pence/100.0)::text||' GBP' FROM director.contributions c WHERE ${PAID_STATUS_SQL}
 ) SELECT a.*,u.email FROM activity a LEFT JOIN director.users u ON u.id=a.actor_id WHERE ($1='' OR u.email ILIKE $2 OR a.action ILIKE $2 OR a.detail ILIKE $2) AND ($3=0 OR a.created_at>=now()-make_interval(days=>$3)) ORDER BY a.created_at DESC LIMIT 100`,
    [q, `%${q}%`, days],
  );
}
export async function founderReviews(
  q: string,
  status: string,
  days: number,
  owner: string,
) {
  return query(
    `SELECT v.id,v.framework,v.status,v.stage,v.created_at,v.updated_at,v.cost_usd,v.error_code,r.title,r.organisation,u.email,r.quality_consent,
 (r.quality_consent OR EXISTS(SELECT 1 FROM director.enquiries e WHERE e.review_id=v.id AND e.share_review)) AS inspection_allowed
 FROM director.reviews v JOIN director.reports r ON r.id=v.report_id JOIN director.users u ON u.id=r.owner_id WHERE v.framework IS DISTINCT FROM 'document' AND ($1='' OR v.status=$1) AND (r.title ILIKE $2 OR u.email ILIKE $2) AND ($3=0 OR v.created_at>=now()-make_interval(days=>$3)) AND ($4='' OR COALESCE(u.canonical_owner_id,u.id)=$4) ORDER BY v.created_at DESC LIMIT 100`,
    [status, `%${q}%`, days, owner],
  );
}
export async function founderEnquiries(
  q: string,
  status: string,
  days: number,
  owner: string,
) {
  return query(
    `SELECT e.id,e.service,e.created_at,e.status,e.converted_at,e.share_review,e.review_id,e.message,COALESCE(e.contact_email,u.email) AS email,COALESCE(e.contact_name,u.name) AS name FROM director.enquiries e JOIN director.users u ON u.id=e.owner_id WHERE e.service<>'feedback' AND ($1='' OR e.status=$1) AND (COALESCE(e.contact_email,u.email) ILIKE $2 OR e.message ILIKE $2) AND ($3=0 OR e.created_at>=now()-make_interval(days=>$3)) AND ($4='' OR COALESCE(u.canonical_owner_id,u.id)=$4) ORDER BY e.created_at DESC LIMIT 100`,
    [status, `%${q}%`, days, owner],
  );
}
export async function founderCosts(days: number) {
  const summary = await query(
    `SELECT COALESCE(model,'Historical model not recorded') AS model,count(*) AS requests,COALESCE(sum(input_tokens),0) AS input_tokens,COALESCE(sum(output_tokens),0) AS output_tokens,COALESCE(sum(cost_usd),0) AS cost_usd,count(*) FILTER(WHERE status='failed' OR error_code IS NOT NULL) AS errors,count(*) FILTER(WHERE input_tokens IS NULL OR output_tokens IS NULL) AS missing_token_records FROM director.processing_events WHERE (model IS NOT NULL OR cost_usd>0) AND ($1=0 OR created_at>=now()-make_interval(days=>$1)) GROUP BY model ORDER BY sum(cost_usd) DESC`,
    [days],
  );
  const daily = await query(
    `SELECT (created_at AT TIME ZONE 'Africa/Kampala')::date AS day,COALESCE(sum(cost_usd),0) AS cost_usd,count(*) FILTER(WHERE model IS NOT NULL OR cost_usd>0) AS requests,count(*) FILTER(WHERE error_code IS NOT NULL) AS errors FROM director.processing_events WHERE ($1=0 OR created_at>=now()-make_interval(days=>$1)) GROUP BY 1 ORDER BY 1 DESC LIMIT 90`,
    [days],
  );
  const frameworks = await query(
    `SELECT COALESCE(v.framework,'legacy') AS framework,count(DISTINCT v.id) AS reviews,count(DISTINCT v.id) FILTER(WHERE v.status='complete') AS completed,COALESCE(sum(p.cost_usd),0) AS cost_usd FROM director.reviews v LEFT JOIN director.processing_events p ON p.review_id=v.id WHERE ($1=0 OR v.created_at>=now()-make_interval(days=>$1)) GROUP BY v.framework ORDER BY v.framework`,
    [days],
  );
  const [documents] = await query(
    `SELECT count(*) AS completed_documents,COALESCE(sum(cost),0) AS cost_usd FROM (SELECT r.id,COALESCE(sum(v.cost_usd),0) AS cost FROM director.reports r JOIN director.reviews v ON v.report_id=r.id WHERE ($1=0 OR r.created_at>=now()-make_interval(days=>$1)) GROUP BY r.id HAVING count(DISTINCT v.framework) FILTER(WHERE v.status='complete' AND v.framework IN ('claims','excellence','report'))=3) d`,
    [days],
  );
  const assessments = await query(
    `SELECT v.id,v.framework,v.status,r.title,v.cost_usd,COALESCE(sum(p.input_tokens),0) AS input_tokens,COALESCE(sum(p.output_tokens),0) AS output_tokens FROM director.reviews v JOIN director.reports r ON r.id=v.report_id LEFT JOIN director.processing_events p ON p.review_id=v.id WHERE ($1=0 OR v.created_at>=now()-make_interval(days=>$1)) GROUP BY v.id,r.title ORDER BY v.created_at DESC LIMIT 50`,
    [days],
  );
  return { summary, daily, frameworks, documents, assessments };
}
