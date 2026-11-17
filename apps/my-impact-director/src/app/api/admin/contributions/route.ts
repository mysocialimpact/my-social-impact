import { founder } from "@/lib/auth";
import { query } from "@/lib/db";
import { contributionConfig } from "@/lib/contributions";
import { failure } from "@/lib/security";
export async function GET(req: Request) {
  try {
    await founder(req);
    const mode = new URL(req.url).searchParams.get("mode");
    const live = mode !== "test";
    const [totals] = await query(
      `SELECT count(*) FILTER(WHERE paid_at IS NOT NULL)::text AS successful,COALESCE(sum(amount_pence) FILTER(WHERE paid_at IS NOT NULL),0)::text AS gross,COALESCE(sum(refunded_pence),0)::text AS refunded,COALESCE(sum(amount_pence-refunded_pence) FILTER(WHERE paid_at IS NOT NULL),0)::text AS net FROM director.contributions WHERE livemode=$1`,
      [live],
    );
    const amounts = await query(
      "SELECT amount_pence,count(*)::text AS count FROM director.contributions WHERE livemode=$1 AND paid_at IS NOT NULL GROUP BY amount_pence ORDER BY amount_pence",
      [live],
    );
    const payments = await query(
      "SELECT c.id,c.created_at,c.updated_at,c.status,c.amount_pence,c.refunded_pence,c.checkout_id,c.payment_intent_id,c.merchant_name,c.review_id,c.stripe_account,u.name,u.email,r.title FROM director.contributions c LEFT JOIN director.users u ON u.id=c.owner_id LEFT JOIN director.reports r ON r.id=c.report_id WHERE c.livemode=$1 ORDER BY c.created_at DESC LIMIT 100",
      [live],
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
