import { z } from "zod";
import type { Identity } from "./auth";
import { query, transaction } from "./db";
import { AppError } from "./security";
import { applyProjectCredit } from "./assessment-pricing";
import {
  lockAssessmentPromotion,
  lockAssessmentScope,
} from "./assessment-orders";
import {
  assessmentStripePrice,
  requireAssessmentStripe,
  verifiedStripePromotion,
  verifyAssessmentMerchant,
} from "./assessment-stripe";
import type { Framework } from "./rubric";

const creditProjection = `
  WITH scoped AS (
    SELECT c.id, c.owner_id, c.report_id, c.framework, c.starts_at, c.ends_at,
           r.applied_pence, r.project_ref, r.commissioned_at, r.recorded_at,
           COALESCE((
             SELECT max(o.list_pence - o.discount_pence)
             FROM director.assessment_orders o
             WHERE o.owner_id=c.owner_id AND o.report_id=c.report_id AND o.framework=c.framework
               AND o.tier='human' AND o.state='paid' AND o.paid_pence>o.refunded_pence
               AND o.blocked_pence=0
               AND o.list_pence-o.discount_pence <= (
                 SELECT sum(p.paid_pence-p.refunded_pence-p.blocked_pence)
                 FROM director.assessment_orders p
                 WHERE p.owner_id=c.owner_id AND p.report_id=c.report_id AND p.framework=c.framework
                   AND p.state='paid'
               )
           ),0)::int AS qualifying
    FROM director.assessment_project_credits c
    LEFT JOIN director.assessment_project_redemptions r ON r.credit_id=c.id
  )
  SELECT *, CASE
    WHEN applied_pence > qualifying THEN 'reconcile'
    WHEN applied_pence IS NOT NULL THEN 'redeemed'
    WHEN ends_at <= now() THEN 'expired'
    WHEN qualifying = 0 THEN 'suspended'
    ELSE 'available'
  END AS status
  FROM scoped
`;

export function customerProjectCredits(user: Identity) {
  return query(
    `SELECT id, framework, starts_at, ends_at, applied_pence, project_ref, status,
       CASE WHEN status='available' THEN qualifying ELSE 0 END AS available_pence
     FROM (${creditProjection}) credits WHERE owner_id=$1 ORDER BY starts_at DESC LIMIT 50`,
    [user.id],
  );
}

export async function assessmentCommerceOverview() {
  const [tiers, promotions, credits, [funnel]] = await Promise.all([
    query(`SELECT tier, count(*) FILTER(WHERE state='paid')::int AS completed,
      count(DISTINCT owner_id) FILTER(WHERE paid_pence>refunded_pence+blocked_pence)::int AS customers,
      count(DISTINCT report_id) FILTER(WHERE paid_pence>refunded_pence+blocked_pence)::int AS reports_purchased,
      COALESCE(sum(paid_pence),0)::int AS gross, COALESCE(sum(refunded_pence),0)::int AS refunded,
      COALESCE(sum(blocked_pence),0)::int AS disputed, COALESCE(sum(stripe_fee_pence),0)::int AS stripe_fees,
      count(*) FILTER(WHERE state='paid' AND stripe_fee_pence IS NULL)::int AS unknown_fees
      FROM director.assessment_orders GROUP BY tier ORDER BY tier`),
    query(`SELECT p.*, count(o.id) FILTER (WHERE o.state='paid')::int AS redeemed,
      count(o.id) FILTER (WHERE o.state='open' OR (o.state='creating' AND o.expires_at>now()))::int AS reserved
      FROM director.assessment_promotions p
      LEFT JOIN director.assessment_orders o ON o.promo_code=p.code
      GROUP BY p.code ORDER BY p.code`),
    query(
      `SELECT * FROM (${creditProjection}) credits ORDER BY starts_at DESC LIMIT 100`,
    ),
    query(`SELECT
      (SELECT count(DISTINCT report_id)::int FROM director.reviews WHERE first_viewed_at IS NOT NULL) AS reports_viewed,
      (SELECT count(DISTINCT lower(project_ref))::int FROM director.assessment_project_redemptions) AS projects_commissioned`),
  ]);
  return { tiers, promotions, credits, funnel };
}

const datetime = z.iso.datetime({ offset: true });
export const commerceAdminInput = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("promotion"),
      code: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z0-9_-]{3,32}$/),
      stripeCodeId: z
        .string()
        .regex(/^promo_[A-Za-z0-9]+$/)
        .nullable(),
      discount: z.number().int().min(1).max(11900),
      limit: z.number().int().positive().max(100000),
      starts: datetime,
      ends: datetime.nullable(),
      eligibility: z.enum(["any", "first_human_purchase"]),
      active: z.boolean(),
    })
    .strict(),
  z
    .object({
      action: z.literal("redeem"),
      id: z.uuid(),
      projectRef: z.string().trim().min(3).max(120),
      projectFee: z.number().int().positive().max(100000000),
      commissionedAt: datetime,
    })
    .strict(),
]);

type AdminAction = z.infer<typeof commerceAdminInput>;

export async function manageAssessmentCommerce(
  founder: Identity,
  input: AdminAction,
) {
  if (!founder.founder) throw new AppError(403, "Founder access is required.");
  if (input.action === "promotion") {
    if (input.ends && new Date(input.ends) <= new Date(input.starts))
      throw new AppError(400, "Set the end date after the start date.");
    if (input.active) {
      const config = requireAssessmentStripe();
      await verifyAssessmentMerchant(config);
      const price = await assessmentStripePrice(config, "human");
      await verifiedStripePromotion(
        config,
        {
          code: input.code,
          stripe_code_id: input.stripeCodeId,
          discount_pence: input.discount,
          starts_at: new Date(input.starts),
          ends_at: input.ends ? new Date(input.ends) : null,
          max_redemptions: input.limit,
          eligibility: input.eligibility,
          active: true,
        },
        price.product,
      );
    }
    return transaction(async (client) => {
      await lockAssessmentPromotion(client, input.code);
      const {
        rows: [usage],
      } = await client.query<{ committed: number }>(
        `SELECT count(*)::int AS committed FROM director.assessment_orders
         WHERE promo_code=$1 AND (state IN ('open','paid') OR (state='creating' AND expires_at>now()))`,
        [input.code],
      );
      if (usage.committed > input.limit)
        throw new AppError(
          409,
          "The limit is below completed and reserved purchases.",
        );
      await client.query(
        `INSERT INTO director.assessment_promotions
          (code,stripe_code_id,discount_pence,max_redemptions,starts_at,ends_at,eligibility,active)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          ON CONFLICT (code) DO UPDATE SET
            stripe_code_id=excluded.stripe_code_id,discount_pence=excluded.discount_pence,
            max_redemptions=excluded.max_redemptions,starts_at=excluded.starts_at,ends_at=excluded.ends_at,
            eligibility=excluded.eligibility,active=excluded.active`,
        [
          input.code,
          input.stripeCodeId,
          input.discount,
          input.limit,
          input.starts,
          input.ends,
          input.eligibility,
          input.active,
        ],
      );
      await client.query(
        "INSERT INTO director.audit(actor_id,action,resource_id) VALUES($1,'assessment-promotion:update',$2)",
        [founder.id, input.code],
      );
      return { saved: true };
    });
  }
  return transaction(async (client) => {
    const {
      rows: [scope],
    } = await client.query<{
      owner_id: string | null;
      report_id: string;
      framework: Framework;
    }>(
      "SELECT owner_id, report_id, framework FROM director.assessment_project_credits WHERE id=$1",
      [input.id],
    );
    if (!scope?.owner_id)
      throw new AppError(404, "This project credit is unavailable.");
    await lockAssessmentScope(client, scope);
    const {
      rows: [credit],
    } = await client.query<{
      starts_at: Date;
      ends_at: Date;
      qualifying: number;
      applied_pence: number | null;
    }>(`SELECT * FROM (${creditProjection}) credits WHERE id=$1`, [input.id]);
    const date = new Date(input.commissionedAt);
    if (credit.applied_pence !== null)
      throw new AppError(409, "This credit has already been used.");
    if (
      date < credit.starts_at ||
      date >= credit.ends_at ||
      date.getTime() > Date.now() ||
      !credit.qualifying
    )
      throw new AppError(
        409,
        "The project must have been commissioned within the eligible 60-day credit period, with a settled Human Intelligence package.",
      );
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended(lower($1),0))",
      ["assessment-project:" + input.projectRef],
    );
    const {
      rows: [project],
    } = await client.query<{ applied: number; fee: number | null }>(
      `SELECT COALESCE(sum(applied_pence),0)::int AS applied, min(project_fee_pence) AS fee
       FROM director.assessment_project_redemptions WHERE lower(project_ref)=lower($1)`,
      [input.projectRef],
    );
    if (project.fee !== null && project.fee !== input.projectFee)
      throw new AppError(
        409,
        "The fee differs from the one already recorded for this project.",
      );
    const balance = input.projectFee - project.applied;
    if (balance <= 0)
      throw new AppError(
        409,
        "Credits already cover this project’s qualifying fee.",
      );
    const { applied, remaining } = applyProjectCredit(
      credit.qualifying,
      balance,
    );
    await client.query(
      `INSERT INTO director.assessment_project_redemptions
       (credit_id,founder_id,project_ref,project_fee_pence,applied_pence,commissioned_at)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        input.id,
        founder.id,
        input.projectRef,
        input.projectFee,
        applied,
        input.commissionedAt,
      ],
    );
    return { applied, remaining };
  });
}
