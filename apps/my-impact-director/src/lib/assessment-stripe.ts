import { stripeRequest } from "./contributions";
import { assessmentPrices, type AssessmentTier } from "./assessment-pricing";
import { AppError } from "./security";

export type AssessmentStripeConfig = {
  account: string;
  secret: string;
  publishableKey: string;
  webhookSecret: string;
};

// The paid assessment runner and the appointment workflow are separate
// releases. This checkout can only use Stripe Sandbox credentials.
export function assessmentStripeConfig(): AssessmentStripeConfig | null {
  if (
    process.env.VERCEL_ENV === "production" ||
    process.env.VERCEL_TARGET_ENV === "production" ||
    process.env.ASSESSMENT_CHECKOUT_SANDBOX !== "true"
  )
    return null;
  const {
    ASSESSMENT_STRIPE_SECRET_KEY: secret = "",
    ASSESSMENT_STRIPE_PUBLISHABLE_KEY: publishableKey = "",
    ASSESSMENT_STRIPE_WEBHOOK_SECRET: webhookSecret = "",
    ASSESSMENT_STRIPE_ACCOUNT: account = "",
  } = process.env;
  if (
    !/^(?:sk|rkcs)_test_/.test(secret) ||
    !publishableKey.startsWith("pk_test_") ||
    !webhookSecret.startsWith("whsec_") ||
    !/^acct_[a-zA-Z0-9]+$/.test(account)
  )
    return null;
  return { account, secret, publishableKey, webhookSecret };
}

export function requireAssessmentStripe() {
  const config = assessmentStripeConfig();
  if (!config)
    throw new AppError(503, "Paid assessment checkout is coming soon.");
  return config;
}

export function assessmentStripe<T>(
  config: AssessmentStripeConfig,
  path: string,
  params?: URLSearchParams,
  idempotency?: string,
) {
  return stripeRequest<T>(path, params, idempotency, config.secret);
}

export async function verifyAssessmentMerchant(config: AssessmentStripeConfig) {
  const account = await assessmentStripe<{
    id: string;
    charges_enabled: boolean;
  }>(config, "account");
  // Stripe CLI's anonymous Sandbox account can run test checkout before
  // business onboarding. These restricted credentials cannot make live calls.
  if (
    account.id !== config.account ||
    (!account.charges_enabled && !config.secret.startsWith("rkcs_test_"))
  ) {
    throw new AppError(
      503,
      "The assessment payment account could not be verified.",
    );
  }
}

export async function assessmentStripePrice(
  config: AssessmentStripeConfig,
  tier: AssessmentTier,
) {
  const id =
    process.env["ASSESSMENT_STRIPE_" + tier.toUpperCase() + "_PRICE"] || "";
  if (!/^price_[A-Za-z0-9]+$/.test(id)) {
    throw new AppError(
      503,
      "The Stripe price for this assessment is unavailable.",
    );
  }
  const price = await assessmentStripe<{
    id: string;
    unit_amount: number;
    currency: string;
    type: string;
    active: boolean;
    livemode: boolean;
    product: { id: string; active: boolean; metadata: Record<string, string> };
  }>(config, "prices/" + id + "?expand%5B%5D=product");
  if (
    price.id !== id ||
    price.livemode !== false ||
    price.type !== "one_time" ||
    !price.active ||
    price.currency !== "gbp" ||
    price.unit_amount !== assessmentPrices[tier] ||
    !price.product?.active ||
    price.product.metadata?.mid_assessment_tier !== tier ||
    !/^prod_[A-Za-z0-9]+$/.test(price.product.id)
  )
    throw new AppError(
      503,
      "The Stripe assessment price could not be verified.",
    );
  return { id: price.id, product: price.product.id };
}

export type AssessmentPromotion = {
  code: string;
  stripe_code_id: string | null;
  discount_pence: number;
  starts_at: Date;
  ends_at: Date | null;
  max_redemptions: number;
  eligibility: "any" | "first_human_purchase";
  active: boolean;
};

export async function verifiedStripePromotion(
  config: AssessmentStripeConfig,
  promo: AssessmentPromotion,
  product: string,
) {
  if (!promo.stripe_code_id)
    throw new AppError(409, "This promotion is not ready.");
  const response = await assessmentStripe<{
    id: string;
    code: string;
    active: boolean;
    livemode: boolean;
    customer: string | null;
    expires_at: number | null;
    max_redemptions: number | null;
    times_redeemed: number;
    restrictions?: {
      first_time_transaction?: boolean;
      minimum_amount?: number | null;
    };
    coupon?: {
      valid: boolean;
      amount_off: number;
      currency: string;
      duration: string;
      redeem_by: number | null;
      applies_to?: { products: string[] };
    };
  }>(
    config,
    "promotion_codes/" +
      promo.stripe_code_id +
      "?expand%5B%5D=coupon.applies_to",
  );
  const coupon = response.coupon;
  if (
    response.id !== promo.stripe_code_id ||
    response.livemode !== false ||
    !response.active ||
    response.code.toUpperCase() !== promo.code ||
    response.customer ||
    response.restrictions?.first_time_transaction ||
    response.restrictions?.minimum_amount ||
    response.max_redemptions !== promo.max_redemptions ||
    response.times_redeemed >= response.max_redemptions ||
    !coupon?.valid ||
    coupon.amount_off !== promo.discount_pence ||
    coupon.currency !== "gbp" ||
    coupon.duration !== "once" ||
    !coupon.applies_to?.products.includes(product)
  )
    throw new AppError(409, "This promotion could not be verified in Stripe.");
  return {
    id: response.id,
    expiresAt: Math.min(
      response.expires_at ?? Infinity,
      coupon.redeem_by ?? Infinity,
    ),
  };
}

export type AssessmentStripeSession = {
  id: string;
  client_secret: string | null;
  amount_total: number;
  currency: string;
  livemode: boolean;
  mode: string;
  status: "open" | "complete" | "expired";
  payment_status: string;
  metadata: Record<string, string>;
  payment_intent: AssessmentStripeIntent | string | null;
  total_details?: { amount_discount: number; amount_tax: number };
};

type AssessmentStripeIntent = {
  id: string;
  currency: string;
  status: string;
  amount_received: number;
  metadata: Record<string, string>;
  latest_charge: {
    id: string;
    paid: boolean;
    captured: boolean;
    amount_captured: number;
    amount_refunded: number;
    created: number;
    disputed: boolean;
    balance_transaction: { fee: number; currency: string } | null;
  } | null;
};

export function readAssessmentSession(
  config: AssessmentStripeConfig,
  id: string,
) {
  if (!/^cs_test_[A-Za-z0-9]+$/.test(id)) {
    throw new AppError(409, "Invalid Stripe Sandbox session.");
  }
  return assessmentStripe<AssessmentStripeSession>(
    config,
    "checkout/sessions/" +
      id +
      "?expand%5B%5D=payment_intent.latest_charge.balance_transaction",
  );
}

export async function assessmentDispute(
  config: AssessmentStripeConfig,
  intentId: string,
  unrefundedPence: number,
) {
  const params = new URLSearchParams({
    payment_intent: intentId,
    limit: "100",
  });
  const disputes = await assessmentStripe<{
    has_more: boolean;
    data: { status: string; amount: number; currency: string }[];
  }>(config, "disputes?" + params);
  if (
    disputes.has_more ||
    disputes.data.some((entry) => entry.currency !== "gbp")
  ) {
    throw new AppError(
      409,
      "This payment requires individual dispute reconciliation.",
    );
  }
  const adverse = disputes.data.filter(
    ({ status }) => !["won", "warning_closed"].includes(status),
  );
  const active = adverse.find(({ status }) => status !== "lost");
  return {
    status:
      active?.status ?? adverse[0]?.status ?? disputes.data[0]?.status ?? null,
    blocked: Math.min(
      unrefundedPence,
      adverse.reduce((sum, entry) => sum + entry.amount, 0),
    ),
  };
}
