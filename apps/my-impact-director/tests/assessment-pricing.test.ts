import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyProjectCredit,
  assessmentEntitlement,
  assessmentQuote,
  eligibleAssessmentPayments,
  type SettledAssessmentPayment,
} from "../src/lib/assessment-pricing";
import { assessmentStripeConfig } from "../src/lib/assessment-stripe";

test("direct prices and every upgrade use exact GBP pence with the founding discount applied once", () => {
  for (const [tier, previous, discount, total, due] of [
    ["advanced", 0, 0, 1900, 1900],
    ["ultimate", 0, 0, 2900, 2900],
    ["human", 0, 0, 14900, 14900],
    ["human", 0, 5000, 9900, 9900],
    ["ultimate", 1900, 0, 2900, 1000],
    ["human", 1900, 0, 14900, 13000],
    ["human", 2900, 0, 14900, 12000],
    ["human", 1900, 5000, 9900, 8000],
    ["human", 2900, 5000, 9900, 7000],
    ["human", 16000, 5000, 9900, 0],
  ] as const) {
    const quote = assessmentQuote(tier, previous, discount);
    assert.equal(quote.due, due);
    assert.equal(quote.packageTotal, total);
    assert.equal(quote.credit + due, total);
  }
  assert.throws(() => assessmentQuote("ultimate", 0, 5000), RangeError);
  assert.throws(() => assessmentQuote("human", -100, 0), RangeError);
});

test("refunds and disputes reduce entitlements and qualifying project balances without compounding the AI spend", () => {
  const payments: SettledAssessmentPayment[] = [
    {
      tier: "advanced",
      paid_pence: 1900,
      refunded_pence: 0,
      blocked_pence: 0,
      discount_pence: 0,
    },
    {
      tier: "ultimate",
      paid_pence: 1000,
      refunded_pence: 0,
      blocked_pence: 0,
      discount_pence: 0,
    },
    {
      tier: "human",
      paid_pence: 7000,
      refunded_pence: 0,
      blocked_pence: 0,
      discount_pence: 5000,
    },
  ];
  assert.equal(assessmentEntitlement(payments), "human");
  assert.deepEqual(
    applyProjectCredit(eligibleAssessmentPayments(payments), 100000),
    { applied: 9900, remaining: 90100 },
  );
  assert.deepEqual(applyProjectCredit(9900, 5000), {
    applied: 5000,
    remaining: 0,
  });
  payments[2].blocked_pence = 7000;
  assert.equal(assessmentEntitlement(payments), "ultimate");
  payments[1].refunded_pence = 1000;
  assert.equal(assessmentEntitlement(payments), "advanced");
  payments[0].refunded_pence = 1900;
  assert.equal(assessmentEntitlement(payments), "everyday");
});

test("assessment checkout requires explicit Sandbox configuration and can never accept production or live Stripe credentials", (t) => {
  const settings = {
    ASSESSMENT_CHECKOUT_SANDBOX: "true",
    ASSESSMENT_STRIPE_ACCOUNT: "acct_assessmentfixture",
    ASSESSMENT_STRIPE_SECRET_KEY: "sk_test_fixture",
    ASSESSMENT_STRIPE_PUBLISHABLE_KEY: "pk_test_fixture",
    ASSESSMENT_STRIPE_WEBHOOK_SECRET: "whsec_fixture",
  };
  const names = [...Object.keys(settings), "VERCEL_ENV", "VERCEL_TARGET_ENV"];
  const previous = Object.fromEntries(
    names.map((name) => [name, process.env[name]]),
  );
  t.after(() => {
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  });
  Object.assign(process.env, settings, {
    VERCEL_ENV: "preview",
    VERCEL_TARGET_ENV: "preview",
  });
  assert.ok(assessmentStripeConfig());
  process.env.ASSESSMENT_STRIPE_SECRET_KEY = "sk_live_fixture";
  assert.equal(assessmentStripeConfig(), null);
  process.env.ASSESSMENT_STRIPE_SECRET_KEY =
    settings.ASSESSMENT_STRIPE_SECRET_KEY;
  process.env.VERCEL_TARGET_ENV = "production";
  assert.equal(assessmentStripeConfig(), null);
  process.env.VERCEL_TARGET_ENV = "preview";
  process.env.VERCEL_ENV = "production";
  assert.equal(assessmentStripeConfig(), null);
});
