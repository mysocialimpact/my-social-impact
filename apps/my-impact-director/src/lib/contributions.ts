import { createHash } from "node:crypto";
import { z } from "zod";
import { query, transaction } from "./db";
import type { Identity } from "./auth";
import { AppError } from "./security";
import {
  contributionPence,
  maximumContribution,
  paymentState,
  SUPPORT_PRODUCT,
} from "./contribution-rules";

type StripeSession = {
  id: string;
  client_secret: string | null;
  amount_total: number;
  currency: string;
  livemode: boolean;
  status: string;
  payment_status: string;
  metadata: Record<string, string>;
  payment_intent:
    | string
    | {
        id: string;
        status: string;
        latest_charge?: { amount_refunded?: number };
      }
    | null;
};
export type Contribution = {
  id: string;
  owner_id: string | null;
  report_id: string | null;
  review_id: string | null;
  attempt_key: string;
  amount_pence: number;
  currency: string;
  livemode: boolean;
  stripe_account: string;
  merchant_name: string;
  receipt_email: string | null;
  checkout_id: string | null;
  payment_intent_id: string | null;
  status: string;
  refunded_pence: number;
};
export function contributionConfig() {
  const secret = process.env.STRIPE_SECRET_KEY || "",
    publicKey = process.env.STRIPE_PUBLISHABLE_KEY || "";
  const live = secret.startsWith("sk_live_");
  const validKeys = live
    ? publicKey.startsWith("pk_live_")
    : secret.startsWith("sk_test_") && publicKey.startsWith("pk_test_");
  const configured =
    validKeys &&
    !!process.env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_") &&
    /^acct_[A-Za-z0-9]+$/.test(
      process.env.CONTRIBUTIONS_STRIPE_ACCOUNT_ID || "",
    ) &&
    !!process.env.CONTRIBUTIONS_MERCHANT_NAME?.trim() &&
    (process.env.VERCEL_ENV === "production" ? live : !live);
  return {
    available: configured && process.env.CONTRIBUTIONS_ENABLED === "true",
    configured,
    live,
    publicKey,
    merchant: process.env.CONTRIBUTIONS_MERCHANT_NAME || "",
    account: process.env.CONTRIBUTIONS_STRIPE_ACCOUNT_ID || "",
    maximum: maximumContribution(),
  };
}
function requireConfig(allowDisabled = false) {
  const config = contributionConfig();
  if (!(allowDisabled ? config.configured : config.available))
    throw new AppError(
      503,
      "Voluntary support is not available at the moment. Your reviews remain free.",
      "SUPPORT_UNAVAILABLE",
    );
  return config;
}
// Same Stripe Embedded Checkout architecture as SORP, with app-specific keys,
// metadata and webhook. SORP's product-bound service/secret is not repurposed.
export async function stripeRequest<T>(
  path: string,
  params?: URLSearchParams,
  idempotency?: string,
  secret = process.env.STRIPE_SECRET_KEY || "",
): Promise<T> {
  if (!/^(?:sk_(?:test|live)|rkcs_test)_/.test(secret))
    throw new AppError(503, "Secure payment is unavailable.");
  let response: Response;
  try {
    response = await fetch(`https://api.stripe.com/v1/${path}`, {
      method: params ? "POST" : "GET",
      headers: {
        authorization: `Bearer ${secret}`,
        "Stripe-Version": "2025-06-30.basil",
        ...(params
          ? { "content-type": "application/x-www-form-urlencoded" }
          : {}),
        ...(idempotency ? { "Idempotency-Key": idempotency } : {}),
      },
      body: params,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
      redirect: "error",
    });
  } catch {
    throw new AppError(
      503,
      "We couldn’t reach Stripe. Please retry this payment screen before starting another contribution.",
      "PAYMENT_CONNECTION",
    );
  }
  const body = await response.json().catch(() => null);
  if (!response.ok || !body)
    throw new AppError(
      503,
      "Stripe couldn’t complete this request. Your review is unaffected; check payment status before trying again.",
      "PAYMENT_PROVIDER",
    );
  return body as T;
}
export async function verifiedMerchant() {
  const config = requireConfig();
  const account = await stripeRequest<{
    id: string;
    charges_enabled: boolean;
    business_profile?: { name?: string };
    company?: { name?: string };
  }>("account");
  if (account.id !== config.account || !account.charges_enabled)
    throw new AppError(
      503,
      "Voluntary support is not available at the moment.",
      "MERCHANT_UNVERIFIED",
    );
  const legalName = account.company?.name || account.business_profile?.name;
  if (!legalName)
    throw new AppError(
      503,
      "The payment recipient is not yet verified.",
      "MERCHANT_UNVERIFIED",
    );
  return { ...config, legalName };
}
export async function contributionReview(user: Identity, id: string) {
  z.uuid().parse(id);
  const [review] = await query<{ id: string; report_id: string }>(
    `SELECT v.id,v.report_id FROM director.reviews v JOIN director.reports r ON r.id=v.report_id WHERE v.id=$1 AND v.status='complete' AND v.result IS NOT NULL AND v.framework IS DISTINCT FROM 'document' AND r.expires_at>now() AND (r.owner_id=ANY($2::text[]) OR EXISTS(SELECT 1 FROM director.review_grants g JOIN director.reviews gv ON gv.id=g.review_id WHERE gv.report_id=r.id AND g.owner_id=ANY($2::text[])))`,
    [id, user.accessIds || [user.id]],
  );
  if (!review)
    throw new AppError(404, "Open your completed review to support our work.");
  return review;
}
export async function supportSummary(user: Identity, reviewId: string) {
  const config = contributionConfig();
  if (!config.available) return { available: false };
  const review = await contributionReview(user, reviewId);
  const merchant = await verifiedMerchant();
  const [support] = await query<{ supported: boolean }>(
    "SELECT EXISTS(SELECT 1 FROM director.contributions WHERE owner_id=ANY($1::text[]) AND livemode=$2 AND amount_pence>refunded_pence AND status IN ('succeeded','partially_refunded') AND created_at>now()-interval '90 days') AS supported",
    [user.accessIds || [user.id], config.live],
  );
  return {
    available: true,
    supported: support.supported,
    report: review.report_id,
    scope: createHash("sha256").update(user.id).digest("hex").slice(0, 16),
    maximum: config.maximum,
    merchant: config.merchant,
    legalName: merchant.legalName,
  };
}
export async function ownedContribution(user: Identity, id: string) {
  z.uuid().parse(id);
  const [row] = await query<Contribution>(
    "SELECT * FROM director.contributions WHERE id=$1 AND owner_id=ANY($2::text[])",
    [id, user.accessIds || [user.id]],
  );
  if (!row)
    throw new AppError(
      404,
      "That contribution is unavailable in this account or browser.",
    );
  const config = requireConfig(true);
  if (row.stripe_account !== config.account || row.livemode !== config.live)
    throw new AppError(
      409,
      "This contribution belongs to a different payment environment.",
    );
  return row;
}
export async function openContribution(
  user: Identity,
  input: { review: string; amount: string; attempt: string },
) {
  const config = await verifiedMerchant(),
    review = await contributionReview(user, input.review);
  let amount: number;
  try {
    amount = contributionPence(input.amount, config.maximum);
  } catch (e) {
    throw new AppError(400, (e as Error).message);
  }
  const contribution = await transaction(async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
      "contribution:" + user.id,
    ]);
    const {
      rows: [prior],
    } = await c.query<Contribution>(
      "SELECT * FROM director.contributions WHERE attempt_key=$1",
      [input.attempt],
    );
    if (prior) {
      if (
        prior.owner_id !== user.id ||
        prior.amount_pence !== amount ||
        prior.report_id !== review.report_id ||
        prior.livemode !== config.live ||
        prior.stripe_account !== config.account
      )
        throw new AppError(
          409,
          "This payment attempt has changed. Check its status before starting another.",
        );
      return prior;
    }
    const {
      rows: [active],
    } = await c.query<Contribution>(
      "SELECT * FROM director.contributions WHERE owner_id=ANY($1::text[]) AND stripe_account=$2 AND livemode=$3 AND status IN ('creating','pending','processing','failed') ORDER BY created_at DESC LIMIT 1",
      [user.accessIds || [user.id], config.account, config.live],
    );
    if (active) {
      if (active.amount_pence !== amount)
        throw new AppError(
          409,
          "A contribution is already open. Resume it or close the payment screen before changing the amount.",
          "PAYMENT_OPEN",
        );
      return active;
    }
    const {
      rows: [created],
    } = await c.query<Contribution>(
      "INSERT INTO director.contributions(owner_id,report_id,review_id,attempt_key,amount_pence,livemode,stripe_account,merchant_name,receipt_email) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *",
      [
        user.id,
        review.report_id,
        review.id,
        input.attempt,
        amount,
        config.live,
        config.account,
        config.legalName,
        user.emailVerified && user.email ? user.email : null,
      ],
    );
    return created;
  });
  if (
    ["succeeded", "partially_refunded", "refunded", "cancelled"].includes(
      contribution.status,
    )
  )
    return {
      id: contribution.id,
      status: contribution.status,
      amount: contribution.amount_pence,
    };
  let session: StripeSession;
  if (contribution.checkout_id)
    session = await stripeRequest<StripeSession>(
      `checkout/sessions/${contribution.checkout_id}?expand[]=payment_intent.latest_charge`,
    );
  else {
    const params = new URLSearchParams({
      mode: "payment",
      ui_mode: "embedded",
      redirect_on_completion: "never",
      "payment_method_types[0]": "card",
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "gbp",
      "line_items[0][price_data][unit_amount]": String(
        contribution.amount_pence,
      ),
      "line_items[0][price_data][product_data][name]":
        "My Impact Director — voluntary support",
      "line_items[0][price_data][product_data][description]":
        "One-off contribution to support the development and operation of free impact report reviews.",
      client_reference_id: contribution.id,
      "metadata[product]": SUPPORT_PRODUCT,
      "metadata[payment_type]": "voluntary_support",
      "metadata[contribution_id]": contribution.id,
      "payment_intent_data[metadata][product]": SUPPORT_PRODUCT,
      "payment_intent_data[metadata][payment_type]": "voluntary_support",
      "payment_intent_data[metadata][contribution_id]": contribution.id,
    });
    if (contribution.receipt_email)
      params.set("customer_email", contribution.receipt_email);
    session = await stripeRequest<StripeSession>(
      "checkout/sessions",
      params,
      `mid-support-${contribution.id}`,
    );
  }
  validateSession(contribution, session);
  await query(
    "UPDATE director.contributions SET checkout_id=$2,updated_at=now() WHERE id=$1",
    [contribution.id, session.id],
  );
  await recordSession(contribution, session);
  const state = paymentState(session, contribution.amount_pence);
  return {
    id: contribution.id,
    status: state.status,
    amount: contribution.amount_pence,
    clientSecret: session.status === "open" ? session.client_secret : null,
    publishableKey: config.publicKey,
    merchant: config.legalName,
  };
}
function validateSession(row: Contribution, session: StripeSession) {
  if (
    session.metadata?.product !== SUPPORT_PRODUCT ||
    session.metadata.contribution_id !== row.id ||
    session.metadata.payment_type !== "voluntary_support" ||
    session.currency !== "gbp" ||
    session.amount_total !== row.amount_pence ||
    session.livemode !== row.livemode
  )
    throw new AppError(
      409,
      "The payment reference could not be verified.",
      "PAYMENT_MISMATCH",
    );
}
async function recordSession(
  row: Contribution,
  session: StripeSession,
  event?: { id: string; type: string },
) {
  validateSession(row, session);
  const state = paymentState(session, row.amount_pence);
  const intent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id || null;
  await transaction(async (c) => {
    if (event) {
      const r = await c.query(
        "INSERT INTO director.contribution_events(event_id,contribution_id,event_type) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING event_id",
        [event.id, row.id, event.type],
      );
      if (!r.rowCount) return;
    }
    await c.query(
      `UPDATE director.contributions SET payment_intent_id=COALESCE($2,payment_intent_id),refunded_pence=GREATEST(refunded_pence,$3),status=CASE WHEN GREATEST(refunded_pence,$3)>=amount_pence THEN 'refunded' WHEN GREATEST(refunded_pence,$3)>0 THEN 'partially_refunded' WHEN status='succeeded' THEN status ELSE $4 END,paid_at=CASE WHEN $4 IN ('succeeded','partially_refunded','refunded') THEN COALESCE(paid_at,now()) ELSE paid_at END,updated_at=now() WHERE id=$1`,
      [row.id, intent, state.refunded, state.status],
    );
  });
}
export async function refreshContribution(
  row: Contribution,
  event?: { id: string; type: string },
) {
  if (!row.checkout_id)
    return {
      status: row.status,
      amount: row.amount_pence,
      refunded: row.refunded_pence,
    };
  const session = await stripeRequest<StripeSession>(
    `checkout/sessions/${row.checkout_id}?expand[]=payment_intent.latest_charge`,
  );
  await recordSession(row, session, event);
  const [fresh] = await query<{
    status: string;
    amount_pence: number;
    refunded_pence: number;
  }>(
    "SELECT status,amount_pence,refunded_pence FROM director.contributions WHERE id=$1",
    [row.id],
  );
  return {
    status: fresh.status,
    amount: fresh.amount_pence,
    refunded: fresh.refunded_pence,
  };
}
export async function cancelContribution(row: Contribution) {
  if (!row.checkout_id)
    throw new AppError(
      409,
      "Stripe may still be opening this payment. Retry the same amount to check it before starting another.",
    );
  const session = await stripeRequest<StripeSession>(
    `checkout/sessions/${row.checkout_id}?expand[]=payment_intent.latest_charge`,
  );
  validateSession(row, session);
  if (session.status === "open")
    await stripeRequest(
      `checkout/sessions/${row.checkout_id}/expire`,
      new URLSearchParams(),
      `mid-expire-${row.id}`,
    );
  const state = await refreshContribution(row);
  if (
    !["cancelled", "succeeded", "partially_refunded", "refunded"].includes(
      state.status,
    )
  )
    throw new AppError(
      409,
      "Payment is still being confirmed. Please check its status before starting another.",
    );
  return state;
}
export async function processContributionEvent(event: {
  id: string;
  type: string;
  livemode: boolean;
  account?: string;
  data: { object: Record<string, unknown> };
}) {
  const config = requireConfig(true);
  if (
    event.livemode !== config.live ||
    (event.account && event.account !== config.account)
  )
    throw new AppError(400, "Wrong payment environment.");
  if (
    !/^(checkout\.session\.(completed|expired|async_payment_succeeded|async_payment_failed)|charge\.refunded|refund\.(created|updated|failed)|payment_intent\.payment_failed)$/.test(
      event.type,
    )
  )
    return;
  const [seen] = await query(
    "SELECT event_id FROM director.contribution_events WHERE event_id=$1",
    [event.id],
  );
  if (seen) return;
  const object = event.data.object;
  let row: Contribution | undefined;
  if (event.type.startsWith("checkout.session.")) {
    [row] = await query<Contribution>(
      "SELECT * FROM director.contributions WHERE checkout_id=$1 AND stripe_account=$2 AND livemode=$3",
      [object.id, config.account, config.live],
    );
    // A webhook can arrive before the session-create response has been saved.
    const metadata = object.metadata as Record<string, string> | undefined;
    if (
      !row &&
      metadata?.product === SUPPORT_PRODUCT &&
      z.uuid().safeParse(metadata.contribution_id).success
    ) {
      [row] = await query<Contribution>(
        "SELECT * FROM director.contributions WHERE id=$1 AND stripe_account=$2 AND livemode=$3",
        [metadata.contribution_id, config.account, config.live],
      );
      if (row) {
        validateSession(row, object as unknown as StripeSession);
        await query(
          "UPDATE director.contributions SET checkout_id=$2 WHERE id=$1 AND checkout_id IS NULL",
          [row.id, object.id],
        );
        row.checkout_id = String(object.id);
      }
    }
  } else {
    const intent = event.type.startsWith("payment_intent.")
      ? object.id
      : object.payment_intent;
    if (typeof intent === "string")
      [row] = await query<Contribution>(
        "SELECT * FROM director.contributions WHERE payment_intent_id=$1 AND stripe_account=$2 AND livemode=$3",
        [intent, config.account, config.live],
      );
  }
  if (row) await refreshContribution(row, event);
}
