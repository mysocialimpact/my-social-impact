import { z } from "zod";
import type { PoolClient } from "@neondatabase/serverless";
import type { Identity } from "./auth";
import { query, transaction } from "./db";
import { AppError } from "./security";
import {
  assessmentEntitlement,
  assessmentQuote,
  eligibleAssessmentPayments,
  assessmentTiers,
  type AssessmentTier,
  type SettledAssessmentPayment,
} from "./assessment-pricing";
import {
  assessmentDispute,
  assessmentStripe,
  assessmentStripePrice,
  requireAssessmentStripe,
  readAssessmentSession,
  verifiedStripePromotion,
  verifyAssessmentMerchant,
  type AssessmentPromotion,
  type AssessmentStripeConfig,
  type AssessmentStripeSession,
} from "./assessment-stripe";
import type { Framework } from "./rubric";

const metadataType = "mid_assessment";
const lockScope = "assessment-order:";
const promoScope = "assessment-promotion:";

export const assessmentOrderInput = z
  .object({
    review: z.uuid(),
    tier: z.enum(assessmentTiers),
    promotion: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,32}$/)
      .optional(),
  })
  .strict();
type OrderInput = z.infer<typeof assessmentOrderInput>;

type OrderScope = {
  owner_id: string | null;
  report_id: string;
  framework: Framework;
};
export type AssessmentOrder = OrderScope &
  SettledAssessmentPayment & {
    id: string;
    review_id: string;
    state: "creating" | "open" | "expired" | "paid";
    stripe_account: string;
    stripe_session_id: string | null;
    stripe_intent_id: string | null;
    stripe_price_id: string;
    stripe_product_id: string;
    promo_code: string | null;
    stripe_promo_id: string | null;
    expires_at: Date;
    paid_at: Date | null;
    list_pence: number;
    credit_pence: number;
    amount_pence: number;
    dispute_status: string | null;
  };

export async function lockAssessmentScope(
  client: PoolClient,
  scope: OrderScope,
) {
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
    lockScope +
      JSON.stringify([scope.owner_id, scope.report_id, scope.framework]),
  ]);
}
export async function lockAssessmentPromotion(
  client: PoolClient,
  code: string,
) {
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
    promoScope + code,
  ]);
}
function scopeParameters(scope: OrderScope) {
  return [scope.owner_id, scope.report_id, scope.framework];
}

export async function settledAssessmentPayments(
  client: PoolClient,
  scope: OrderScope,
) {
  const { rows } = await client.query<
    SettledAssessmentPayment & { dispute_status: string | null }
  >(
    `SELECT tier, paid_pence, refunded_pence, blocked_pence, discount_pence, dispute_status
    FROM director.assessment_orders
    WHERE owner_id=$1 AND report_id=$2 AND framework=$3 AND state='paid'
    ORDER BY paid_at, id`,
    scopeParameters(scope),
  );
  return rows;
}

async function purchaseScope(
  client: PoolClient,
  user: Identity,
  review: string,
) {
  if (user.anonymous || !user.emailVerified)
    throw new AppError(
      403,
      "A verified account is required to buy an assessment.",
    );
  const {
    rows: [scope],
  } = await client.query<OrderScope & { review_id: string }>(
    `SELECT $2::text AS owner_id, v.report_id, v.framework, v.id AS review_id
      FROM director.reviews v JOIN director.reports r ON r.id=v.report_id
      WHERE v.id=$1 AND v.framework IN ('claims','excellence','report')
      AND v.status='complete' AND jsonb_typeof(v.result->'scores'->v.framework)='object'
      AND r.expires_at>now()
      AND (r.owner_id=ANY($3::text[]) OR EXISTS (
        SELECT 1 FROM director.review_grants g JOIN director.reviews gv ON gv.id=g.review_id
        WHERE gv.report_id=r.id AND g.owner_id=ANY($3::text[])
      ))`,
    [review, user.id, user.accessIds || [user.id]],
  );
  if (!scope)
    throw new AppError(404, "Open a completed assessment from My Reports.");
  return scope;
}

async function availablePromotion(
  client: PoolClient,
  input: OrderInput,
  owner: string,
) {
  if (!input.promotion) return null;
  if (input.tier !== "human")
    throw new AppError(400, "This promotion is for Human Intelligence.");
  await lockAssessmentPromotion(client, input.promotion);
  const {
    rows: [promo],
  } = await client.query<AssessmentPromotion>(
    `SELECT p.* FROM director.assessment_promotions p
      WHERE p.code=$1 AND p.active AND p.starts_at<=now()
      AND (p.ends_at IS NULL OR p.ends_at>now()+interval '31 minutes')
      AND p.max_redemptions > (
        SELECT count(*) FROM director.assessment_orders o WHERE o.promo_code=p.code
        AND (o.state IN ('open','paid') OR (o.state='creating' AND o.expires_at>now()))
      )
      AND (p.eligibility='any' OR NOT EXISTS (
        SELECT 1 FROM director.assessment_orders o WHERE o.owner_id=$2 AND o.tier='human'
        AND (o.state IN ('open','paid') OR (o.state='creating' AND o.expires_at>now()))
      ))`,
    [input.promotion, owner],
  );
  if (!promo)
    throw new AppError(409, "This promotion is unavailable for this purchase.");
  return promo;
}

async function pendingOrder(client: PoolClient, scope: OrderScope) {
  await client.query(
    `UPDATE director.assessment_orders SET state='expired', updated_at=now()
     WHERE owner_id=$1 AND report_id=$2 AND framework=$3
       AND state='creating' AND stripe_session_id IS NULL AND expires_at<=now()`,
    scopeParameters(scope),
  );
  const {
    rows: [pending],
  } = await client.query<AssessmentOrder>(
    `SELECT * FROM director.assessment_orders
     WHERE owner_id=$1 AND report_id=$2 AND framework=$3 AND state IN ('creating','open')`,
    scopeParameters(scope),
  );
  return pending;
}

function priceFromOrder(order: AssessmentOrder) {
  return {
    tier: order.tier,
    list: order.list_pence,
    discount: order.discount_pence,
    credit: order.credit_pence,
    due: order.amount_pence,
    packageTotal: order.list_pence - order.discount_pence,
  };
}

async function newQuote(
  client: PoolClient,
  scope: OrderScope,
  owner: string,
  input: OrderInput,
) {
  const payments = await settledAssessmentPayments(client, scope);
  const current = assessmentEntitlement(payments);
  if (
    current !== "everyday" &&
    assessmentTiers.indexOf(current) >= assessmentTiers.indexOf(input.tier)
  ) {
    throw new AppError(409, "Your account already has this assessment level.");
  }
  if (
    payments.some(
      (p) =>
        p.dispute_status &&
        !["lost", "won", "warning_closed"].includes(p.dispute_status),
    )
  ) {
    throw new AppError(
      409,
      "An earlier payment is under review. Wait for it to be resolved before upgrading.",
    );
  }
  // A standard purchase can also change first-purchase eligibility for
  // another framework or upload.
  if (input.tier === "human") {
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
      "assessment-promotion-account:" + owner,
    ]);
    const { rowCount } = await client.query(
      `SELECT 1 FROM director.assessment_orders
        WHERE owner_id=$1 AND tier='human'
        AND (state='open' OR (state='creating' AND expires_at>now())) LIMIT 1`,
      [owner],
    );
    if (rowCount)
      throw new AppError(
        409,
        "Finish or check your existing Human Intelligence checkout first.",
      );
  }
  const promo = await availablePromotion(client, input, owner);
  const quote = assessmentQuote(
    input.tier,
    eligibleAssessmentPayments(payments),
    promo?.discount_pence,
  );
  if (quote.due < 30)
    throw new AppError(
      409,
      "Please contact us to settle the remaining balance.",
    );
  return { quote, promo, current };
}

export async function quoteAssessmentOrder(user: Identity, input: OrderInput) {
  requireAssessmentStripe();
  return transaction(async (client) => {
    const scope = await purchaseScope(client, user, input.review);
    if (user.founder) return { internal: true as const, tier: input.tier };
    await lockAssessmentScope(client, scope);
    const pending = await pendingOrder(client, scope);
    if (pending)
      return {
        pending: { id: pending.id, promotion: pending.promo_code },
        quote: priceFromOrder(pending),
      };
    const { quote, current } = await newQuote(client, scope, user.id, input);
    return { quote, current };
  });
}

export async function openAssessmentOrder(
  user: Identity,
  input: OrderInput & { due: number },
) {
  const config = requireAssessmentStripe();
  await verifyAssessmentMerchant(config);
  const order = await transaction(async (client) => {
    const scope = await purchaseScope(client, user, input.review);
    if (user.founder) return null;
    await lockAssessmentScope(client, scope);
    const pending = await pendingOrder(client, scope);
    if (pending) {
      if (
        pending.tier !== input.tier ||
        pending.promo_code !== (input.promotion || null) ||
        pending.amount_pence !== input.due ||
        pending.stripe_account !== config.account
      )
        throw new AppError(
          409,
          "A checkout already exists for this assessment. Check its status before opening another.",
        );
      return pending;
    }
    const { quote, promo } = await newQuote(client, scope, user.id, input);
    if (input.due !== quote.due)
      throw new AppError(
        409,
        "Your price has changed. Refresh the calculation before continuing.",
      );
    const price = await assessmentStripePrice(config, input.tier);
    const stripePromo = promo
      ? await verifiedStripePromotion(config, promo, price.product)
      : null;
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = Math.min(
      now + 3600,
      promo?.ends_at ? Math.floor(promo.ends_at.getTime() / 1000) : Infinity,
      stripePromo?.expiresAt ?? Infinity,
    );
    if (expiresAt < now + 1860)
      throw new AppError(
        409,
        "This promotion is too close to its expiry for a new checkout.",
      );
    const {
      rows: [reserved],
    } = await client.query<AssessmentOrder>(
      `INSERT INTO director.assessment_orders
        (owner_id, report_id, framework, review_id, tier, stripe_account, stripe_price_id, stripe_product_id,
         list_pence, promo_code, stripe_promo_id, discount_pence, credit_pence, amount_pence, expires_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,to_timestamp($15))
      RETURNING *`,
      [
        ...scopeParameters(scope),
        scope.review_id,
        input.tier,
        config.account,
        price.id,
        price.product,
        quote.list,
        promo?.code ?? null,
        stripePromo?.id ?? null,
        quote.discount,
        quote.credit,
        quote.due,
        expiresAt,
      ],
    );
    return reserved;
  });
  if (!order) return { internal: true as const, tier: input.tier };
  // The reservation is already durable. Serialise Stripe creation so retries
  // can resume it without racing the same provider idempotency key.
  return transaction(async (client) => {
    await lockAssessmentScope(client, order);
    const {
      rows: [current],
    } = await client.query<AssessmentOrder>(
      "SELECT * FROM director.assessment_orders WHERE id=$1",
      [order.id],
    );
    if (!current || current.state === "expired")
      throw new AppError(
        409,
        "This checkout has expired. Request a new calculation.",
      );
    return stripeCheckoutForOrder(client, current, config);
  });
}

async function stripeCheckoutForOrder(
  client: PoolClient,
  order: AssessmentOrder,
  config: AssessmentStripeConfig,
) {
  if (order.stripe_session_id) {
    const session = await readAssessmentSession(
      config,
      order.stripe_session_id,
    );
    validateSession(order, session);
    return checkoutResponse(order, session, config);
  }
  if (order.state !== "creating")
    throw new AppError(
      409,
      "The saved Stripe checkout reference is unavailable.",
    );
  const params = new URLSearchParams({
    mode: "payment",
    ui_mode: "embedded",
    redirect_on_completion: "never",
    "adaptive_pricing[enabled]": "false",
    "payment_method_types[0]": "card",
    "line_items[0][quantity]": "1",
    expires_at: String(Math.floor(order.expires_at.getTime() / 1000)),
    client_reference_id: order.id,
    "metadata[payment_type]": metadataType,
    "metadata[assessment_order]": order.id,
    "payment_intent_data[metadata][payment_type]": metadataType,
    "payment_intent_data[metadata][assessment_order]": order.id,
  });
  if (order.credit_pence > 0) {
    params.set("line_items[0][price_data][currency]", "gbp");
    params.set(
      "line_items[0][price_data][unit_amount]",
      String(order.list_pence - order.credit_pence),
    );
    params.set("line_items[0][price_data][product]", order.stripe_product_id);
  } else params.set("line_items[0][price]", order.stripe_price_id);
  if (order.stripe_promo_id)
    params.set("discounts[0][promotion_code]", order.stripe_promo_id);
  const session = await assessmentStripe<AssessmentStripeSession>(
    config,
    "checkout/sessions",
    params,
    "mid-assessment-" + order.id,
  );
  validateSession(order, session);
  const {
    rows: [recorded],
  } = await client.query<AssessmentOrder>(
    `UPDATE director.assessment_orders
     SET stripe_session_id=$2, state='open', updated_at=now()
     WHERE id=$1 AND state='creating'
     RETURNING *`,
    [order.id, session.id],
  );
  if (!recorded)
    throw new AppError(
      409,
      "This checkout has expired. Request a new calculation.",
    );
  return checkoutResponse(recorded, session, config);
}

function checkoutResponse(
  order: AssessmentOrder,
  session: AssessmentStripeSession,
  config: AssessmentStripeConfig,
) {
  return {
    id: order.id,
    state: order.state,
    quote: priceFromOrder(order),
    clientSecret:
      order.state === "open" && session.status === "open"
        ? session.client_secret
        : null,
    publishableKey: config.publishableKey,
    sandbox: true as const,
  };
}

function validateSession(
  order: AssessmentOrder,
  session: AssessmentStripeSession,
) {
  if (
    !/^cs_test_[A-Za-z0-9]+$/.test(session.id) ||
    (order.stripe_session_id && order.stripe_session_id !== session.id) ||
    session.livemode !== false ||
    session.currency !== "gbp" ||
    session.mode !== "payment" ||
    session.amount_total !== order.amount_pence ||
    session.total_details?.amount_discount !== order.discount_pence ||
    session.total_details.amount_tax !== 0 ||
    session.metadata?.payment_type !== metadataType ||
    session.metadata.assessment_order !== order.id
  )
    throw new AppError(
      409,
      "The Stripe payment does not match the assessment order.",
    );
}

export function assessmentLevel(user: Identity, reviewId: string) {
  requireAssessmentStripe();
  return transaction(async (client) => {
    const scope = await purchaseScope(client, user, reviewId);
    if (user.founder) return "internal";
    await lockAssessmentScope(client, scope);
    return assessmentEntitlement(
      await settledAssessmentPayments(client, scope),
    );
  });
}

export async function assessmentOrderStatus(user: Identity, id: string) {
  const config = requireAssessmentStripe();
  const [order] = await query<AssessmentOrder>(
    "SELECT * FROM director.assessment_orders WHERE id=$1 AND owner_id=$2 AND stripe_account=$3",
    [id, user.id, config.account],
  );
  if (!order) throw new AppError(404, "This assessment order is unavailable.");
  // Stripe may confirm an unpaid session has expired. Only a verified webhook
  // can create a paid entitlement.
  if (
    order.state === "open" &&
    order.stripe_session_id &&
    order.expires_at.getTime() <= Date.now()
  ) {
    const session = await readAssessmentSession(
      config,
      order.stripe_session_id,
    );
    validateSession(order, session);
    if (session.status === "expired") {
      await query(
        "UPDATE director.assessment_orders SET state='expired', updated_at=now() WHERE id=$1 AND state='open'",
        [id],
      );
      order.state = "expired";
    }
  }
  return {
    id,
    tier: order.tier,
    state: order.state,
    refunded: order.refunded_pence,
    dispute: order.dispute_status,
    quote: priceFromOrder(order),
  };
}

export type AssessmentStripeEvent = {
  id: string;
  type: string;
  livemode: boolean;
  account?: string;
  data: { object: Record<string, unknown> };
};

export async function settleAssessmentEvent(
  config: AssessmentStripeConfig,
  event: AssessmentStripeEvent,
) {
  if (event.livemode || (event.account && event.account !== config.account)) {
    throw new AppError(400, "Unexpected payment environment.");
  }
  const object = event.data.object;
  let orderId: unknown;
  let sessionId: string | undefined;
  if (
    [
      "checkout.session.completed",
      "checkout.session.expired",
      "checkout.session.async_payment_succeeded",
    ].includes(event.type)
  ) {
    const metadata = object.metadata as Record<string, unknown> | undefined;
    if (metadata?.payment_type !== metadataType) return;
    orderId = metadata.assessment_order;
    sessionId = typeof object.id === "string" ? object.id : undefined;
  } else if (
    event.type === "charge.refunded" ||
    event.type.startsWith("charge.dispute.")
  ) {
    if (
      typeof object.payment_intent !== "string" ||
      !/^pi_[a-zA-Z0-9]+$/.test(object.payment_intent)
    )
      return;
    const [existing] = await query<{ id: string }>(
      "SELECT id FROM director.assessment_orders WHERE stripe_intent_id=$1 AND stripe_account=$2",
      [object.payment_intent, config.account],
    );
    orderId = existing?.id;
    if (!orderId) {
      const intent = await assessmentStripe<{
        metadata?: Record<string, string>;
      }>(config, "payment_intents/" + object.payment_intent);
      if (intent.metadata?.payment_type !== metadataType) return;
      orderId = intent.metadata.assessment_order;
    }
  } else return;
  const parsed = z.uuid().safeParse(orderId);
  if (!parsed.success)
    throw new AppError(409, "The order reference is missing.");
  await transaction(async (client) => {
    const {
      rows: [initial],
    } = await client.query<AssessmentOrder>(
      "SELECT * FROM director.assessment_orders WHERE id=$1 AND stripe_account=$2",
      [parsed.data, config.account],
    );
    if (!initial)
      throw new AppError(409, "The assessment order could not be found.");
    await lockAssessmentScope(client, initial);
    const {
      rows: [order],
    } = await client.query<AssessmentOrder>(
      "SELECT * FROM director.assessment_orders WHERE id=$1 FOR UPDATE",
      [initial.id],
    );
    const {
      rows: [inserted],
    } = await client.query(
      `INSERT INTO director.assessment_payment_events(event_id, order_id, event_type)
       VALUES($1,$2,$3) ON CONFLICT (event_id) DO NOTHING RETURNING event_id`,
      [event.id, order.id, event.type],
    );
    if (!inserted) return;
    const reference = sessionId || order.stripe_session_id;
    if (!reference)
      throw new AppError(503, "The checkout is still being recorded.");
    const session = await readAssessmentSession(config, reference);
    validateSession(order, session);
    if (session.status === "expired") {
      await client.query(
        "UPDATE director.assessment_orders SET state='expired', stripe_session_id=$2, updated_at=now() WHERE id=$1 AND state IN ('open','creating')",
        [order.id, session.id],
      );
      return;
    }
    if (session.status !== "complete" || session.payment_status !== "paid")
      return;
    const intent = session.payment_intent;
    if (
      !intent ||
      typeof intent === "string" ||
      (order.stripe_intent_id && intent.id !== order.stripe_intent_id) ||
      !/^pi_[A-Za-z0-9]+$/.test(intent.id) ||
      intent.currency !== "gbp" ||
      intent.amount_received !== order.amount_pence ||
      intent.status !== "succeeded" ||
      intent.metadata?.payment_type !== metadataType ||
      intent.metadata.assessment_order !== order.id ||
      !intent.latest_charge?.paid ||
      !intent.latest_charge.captured ||
      intent.latest_charge.amount_captured !== order.amount_pence
    ) {
      throw new AppError(
        409,
        "The captured Stripe payment could not be verified.",
      );
    }
    const charge = intent.latest_charge;
    const refunded = charge.amount_refunded;
    const dispute =
      charge.disputed ||
      order.dispute_status ||
      event.type.startsWith("charge.dispute.")
        ? await assessmentDispute(
            config,
            intent.id,
            order.amount_pence - refunded,
          )
        : { status: null, blocked: 0 };
    const fee =
      charge.balance_transaction?.currency === "gbp"
        ? charge.balance_transaction.fee
        : null;
    await client.query(
      `UPDATE director.assessment_orders
       SET state='paid', paid_at=COALESCE(paid_at,to_timestamp($3)), paid_pence=amount_pence,
       refunded_pence=$4, blocked_pence=$5, dispute_status=$6, stripe_intent_id=$7,
       stripe_fee_pence=COALESCE($8,stripe_fee_pence), stripe_session_id=$2, updated_at=now()
       WHERE id=$1`,
      [
        order.id,
        session.id,
        charge.created,
        refunded,
        dispute.blocked,
        dispute.status,
        intent.id,
        fee,
      ],
    );
    if (order.tier === "human" && order.owner_id) {
      await client.query(
        `INSERT INTO director.assessment_project_credits(human_order_id, owner_id, report_id, framework, starts_at, ends_at)
        VALUES ($1,$2,$3,$4,to_timestamp($5),to_timestamp($5)+interval '60 days')
        ON CONFLICT (owner_id, report_id, framework) DO NOTHING`,
        [order.id, ...scopeParameters(order), charge.created],
      );
    }
  });
}
