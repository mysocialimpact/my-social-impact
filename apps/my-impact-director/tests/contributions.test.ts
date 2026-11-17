import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  contributionPence,
  paymentState,
  verifyStripeSignature,
} from "../src/lib/contribution-rules";
import { contributionConfig } from "../src/lib/contributions";
test("support amounts use exact integer pence and reject invalid/custom over-limit amounts", () => {
  for (const [value, pence] of [
    ["5", 500],
    ["10", 1000],
    ["20", 2000],
    ["1.01", 101],
    ["15.5", 1550],
    ["1000", 100000],
  ] as const)
    assert.equal(contributionPence(value), pence);
  for (const value of [
    "0",
    "0.99",
    "1000.01",
    "-5",
    "1e2",
    "5.005",
    "£5",
    "5,00",
    "Infinity",
    "",
    5,
    null,
  ])
    assert.throws(() => contributionPence(value));
  assert.throws(() => contributionPence("25", 2000));
});
test("webhook verification binds unmodified body, timestamp, secret and rotated signature", () => {
  const raw = '{"id":"evt_fixture"}',
    now = 1700000000000,
    t = String(now / 1000),
    secret = "whsec_fixture";
  const digest = createHmac("sha256", secret)
    .update(t + "." + raw)
    .digest("hex");
  assert.equal(
    verifyStripeSignature(
      raw,
      `t=${t},v1=${"0".repeat(64)},v1=${digest}`,
      secret,
      now,
    ),
    true,
  );
  for (const [body, signature, key, time] of [
    [raw + " ", `t=${t},v1=${digest}`, secret, now],
    [raw, `t=${t},v1=${digest}`, "wrong", now],
    [raw, `t=${t},v1=${digest}`, secret, now + 301000],
    [raw, `t=${t},t=${t},v1=${digest}`, secret, now],
    [raw, `t=${t},v1=xyz`, secret, now],
  ] as const)
    assert.equal(verifyStripeSignature(body, signature, key, time), false);
});
test("pending browser completion cannot become success without Stripe paid status; refunds remain explicit", () => {
  assert.equal(
    paymentState({ status: "complete", payment_status: "unpaid" }, 500).status,
    "processing",
  );
  assert.equal(
    paymentState(
      {
        status: "open",
        payment_status: "unpaid",
        payment_intent: { status: "requires_payment_method" },
      },
      500,
    ).status,
    "failed",
  );
  assert.equal(
    paymentState({ status: "complete", payment_status: "paid" }, 500).status,
    "succeeded",
  );
  assert.equal(
    paymentState({ status: "expired", payment_status: "unpaid" }, 500).status,
    "cancelled",
  );
  assert.deepEqual(
    paymentState(
      {
        payment_status: "paid",
        payment_intent: { latest_charge: { amount_refunded: 200 } },
      },
      500,
    ),
    { status: "partially_refunded", refunded: 200 },
  );
  assert.equal(
    paymentState(
      {
        payment_status: "paid",
        payment_intent: { latest_charge: { amount_refunded: 500 } },
      },
      500,
    ).status,
    "refunded",
  );
});
test("public support fails closed; test and live credentials cannot cross deployment environments", () => {
  const keys = [
    "CONTRIBUTIONS_ENABLED",
    "STRIPE_SECRET_KEY",
    "STRIPE_PUBLISHABLE_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "CONTRIBUTIONS_STRIPE_ACCOUNT_ID",
    "CONTRIBUTIONS_MERCHANT_NAME",
    "VERCEL_ENV",
  ];
  const before = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  try {
    Object.assign(process.env, {
      CONTRIBUTIONS_ENABLED: "true",
      STRIPE_SECRET_KEY: "sk_test_fixture",
      STRIPE_PUBLISHABLE_KEY: "pk_test_fixture",
      STRIPE_WEBHOOK_SECRET: "whsec_fixture",
      CONTRIBUTIONS_STRIPE_ACCOUNT_ID: "acct_fixture",
      CONTRIBUTIONS_MERCHANT_NAME: "Fictional QA merchant",
      VERCEL_ENV: "preview",
    });
    assert.equal(contributionConfig().available, true);
    process.env.VERCEL_ENV = "production";
    assert.equal(contributionConfig().available, false);
    process.env.STRIPE_SECRET_KEY = "sk_live_fixture";
    assert.equal(contributionConfig().available, false);
    process.env.STRIPE_PUBLISHABLE_KEY = "pk_live_fixture";
    assert.equal(contributionConfig().available, true);
    process.env.CONTRIBUTIONS_ENABLED = "false";
    assert.equal(contributionConfig().available, false);
    assert.equal(contributionConfig().configured, true);
    delete process.env.STRIPE_WEBHOOK_SECRET;
    assert.equal(contributionConfig().configured, false);
  } finally {
    for (const key of keys) {
      if (before[key] === undefined) delete process.env[key];
      else process.env[key] = before[key];
    }
  }
});
