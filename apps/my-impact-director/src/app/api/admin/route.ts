import { z } from "zod";
import { founder } from "@/lib/auth";
import { query } from "@/lib/db";
import { failure, sameOrigin, readJson } from "@/lib/security";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    await founder(req);
    const url = new URL(req.url),
      q = (url.searchParams.get("q") || "").slice(0, 150),
      status = url.searchParams.get("status") || "",
      service = (url.searchParams.get("service") || "").slice(0, 50);
    const [metrics] = await query(
      `SELECT (SELECT count(*) FROM director.users u WHERE (is_anonymous=false OR account_email IS NOT NULL) AND (canonical_owner_id IS NULL OR canonical_owner_id=id)) AS users,(SELECT count(*) FROM director.users WHERE password_verified_at IS NOT NULL) AS verified_accounts,(SELECT count(*) FROM director.users WHERE marketing_opt_in AND (canonical_owner_id IS NULL OR canonical_owner_id=id)) AS marketing_opt_ins,(SELECT count(*) FROM director.email_links WHERE purpose='assessment-share') AS shares_generated,(SELECT count(DISTINCT organisation) FROM director.reports WHERE organisation<>'') AS organisations,(SELECT count(*) FROM director.reviews WHERE framework IS DISTINCT FROM 'document') AS reviews,(SELECT count(*) FROM director.reviews WHERE status='complete' AND framework IS DISTINCT FROM 'document') AS completed,(SELECT count(*) FROM director.reviews WHERE status='failed') AS failed,(SELECT count(*) FROM director.reviews WHERE status IN ('running','queued')) AS pending,(SELECT count(*) FROM director.enquiries) AS enquiries,(SELECT count(DISTINCT owner_id) FROM director.enquiries) AS enquirers,(SELECT count(DISTINCT r.owner_id) FROM director.reports r JOIN director.reviews v ON v.report_id=r.id WHERE v.status='complete') AS reviewed_users,(SELECT COALESCE(sum(cost_usd),0) FROM director.reviews) AS cost_usd`,
    );
    const users = await query(
      `SELECT u.id,u.name,COALESCE(NULLIF(u.email,''),u.account_email) AS email,u.email_verified_at,u.organisation,u.created_at,u.last_seen,u.marketing_opt_in AS opted_in,u.marketing_recorded_at AS consent_at,u.marketing_wording_version AS wording_version,(SELECT count(*) FROM director.email_links s WHERE s.owner_id=u.id AND s.purpose='assessment-share') AS shares_generated FROM director.users u WHERE (u.is_anonymous=false OR u.account_email IS NOT NULL) AND (u.canonical_owner_id IS NULL OR u.canonical_owner_id=u.id) AND (u.email ILIKE $1 OR u.name ILIKE $1 OR u.account_email ILIKE $1) ORDER BY u.last_seen DESC LIMIT 100`,
      ["%" + q + "%"],
    );
    const reviews = await query(
      `SELECT v.id,v.framework,v.status,v.stage,v.created_at,v.error_code,v.cost_usd,v.result->'scores' AS scores,r.title,r.organisation,r.source_url,r.quality_consent,u.email FROM director.reviews v JOIN director.reports r ON r.id=v.report_id JOIN director.users u ON u.id=r.owner_id WHERE ($1='' OR v.status=$1) AND (r.title ILIKE $2 OR r.organisation ILIKE $2 OR u.email ILIKE $2) ORDER BY v.created_at DESC LIMIT 100`,
      [status, "%" + q + "%"],
    );
    const enquiries = await query(
      `SELECT e.*,COALESCE(e.contact_name,u.name) AS name,COALESCE(e.contact_email,u.email) AS email FROM director.enquiries e JOIN director.users u ON u.id=e.owner_id WHERE (e.message ILIKE $1 OR COALESCE(e.contact_email,u.email) ILIKE $1 OR COALESCE(e.contact_name,u.name) ILIKE $1) AND ($2='' OR e.service=$2 OR ($2='ongoing' AND e.service IN ('human-director','essentials','supported','director','bespoke'))) ORDER BY e.created_at DESC LIMIT 100`,
      ["%" + q + "%", service],
    );
    const usage = await query(
      "SELECT event,sum(count)::text AS count FROM director.daily_metrics WHERE day>=CURRENT_DATE-30 GROUP BY event",
    );
    const deliveries = await query(
      "SELECT d.email,d.attempts,d.delivered_at,r.title,v.framework FROM director.report_deliveries d JOIN director.reviews v ON v.id=d.review_id JOIN director.reports r ON r.id=v.report_id ORDER BY d.next_attempt_at DESC LIMIT 100",
    );
    return Response.json(
      { metrics, users, reviews, enquiries, usage, deliveries },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const user = await founder(req);
    const data = z
      .object({ id: z.uuid(), status: z.enum(["new", "contacted", "closed"]) })
      .strict()
      .parse(await readJson(req));
    await query("UPDATE director.enquiries SET status=$2 WHERE id=$1", [
      data.id,
      data.status,
    ]);
    await query(
      "INSERT INTO director.audit(actor_id,action,resource_id) VALUES($1,$2,$3)",
      [user.id, "enquiry-status", data.id],
    );
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
