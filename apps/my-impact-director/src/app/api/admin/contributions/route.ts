import { founder } from "@/lib/auth";
import { query } from "@/lib/db";
import { contributionConfig } from "@/lib/contributions";
import { failure } from "@/lib/security";
export async function GET(req: Request) {
  try {
    await founder(req);
    const params = new URL(req.url).searchParams;
    const mode = params.get("mode");
    const owner = (params.get("owner") || "").slice(0, 150);
    const live = mode !== "test";
    const [totals] = await query(
      `SELECT count(*) FILTER(WHERE paid_at IS NOT NULL AND status IN ('succeeded','partially_refunded','refunded'))::text AS successful,COALESCE(sum(amount_pence) FILTER(WHERE paid_at IS NOT NULL AND status IN ('succeeded','partially_refunded','refunded')),0)::text AS gross,COALESCE(sum(refunded_pence) FILTER(WHERE paid_at IS NOT NULL AND status IN ('succeeded','partially_refunded','refunded')),0)::text AS refunded,COALESCE(sum(amount_pence-refunded_pence) FILTER(WHERE paid_at IS NOT NULL AND status IN ('succeeded','partially_refunded','refunded')),0)::text AS net FROM director.contributions WHERE livemode=$1 AND ($2='' OR owner_id IN (SELECT id FROM director.users WHERE id=$2 OR canonical_owner_id=$2))`,
      [live, owner],
    );
    const amounts = await query(
      "SELECT amount_pence,count(*)::text AS count FROM director.contributions WHERE livemode=$1 AND ($2='' OR owner_id IN(SELECT id FROM director.users WHERE id=$2 OR canonical_owner_id=$2)) AND paid_at IS NOT NULL AND status IN ('succeeded','partially_refunded','refunded') GROUP BY amount_pence ORDER BY amount_pence",
      [live, owner],
    );
    const payments = await query(
      "SELECT c.id,c.created_at,c.updated_at,c.status,c.amount_pence,c.refunded_pence,c.checkout_id,c.payment_intent_id,c.merchant_name,c.review_id,c.stripe_account,u.name,u.email,r.title FROM director.contributions c LEFT JOIN director.users u ON u.id=c.owner_id LEFT JOIN director.reports r ON r.id=c.report_id WHERE c.livemode=$1 AND ($2='' OR COALESCE(u.canonical_owner_id,u.id)=$2) ORDER BY c.created_at DESC LIMIT 100",
      [live, owner],
    );
    return Response.json(
      {
        available: contributionConfig().available,
        live,
        totals,
        amounts,
        payments,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
