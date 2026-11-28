import { createHmac, randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { test } from "node:test";
import { PDFDocument } from "pdf-lib";
import { createReview } from "../src/lib/reviews";
import { database, query } from "../src/lib/db";
import type { Identity } from "../src/lib/auth";
import {
  assessmentLevel,
  assessmentOrderStatus,
  openAssessmentOrder,
  quoteAssessmentOrder,
} from "../src/lib/assessment-orders";
import {
  assessmentCommerceOverview,
  customerProjectCredits,
  manageAssessmentCommerce,
} from "../src/lib/assessment-commerce-admin";
import {
  assessmentPrices,
  type AssessmentTier,
} from "../src/lib/assessment-pricing";
import { POST as webhook } from "../src/app/api/assessment-checkout/webhook/route";

type StripeSession = {
  id: string;
  client_secret: string;
  currency: string;
  livemode: boolean;
  mode: string;
  amount_total: number;
  total_details: { amount_discount: number; amount_tax: number };
  status: string;
  payment_status: string;
  metadata: { payment_type: string; assessment_order: string };
  payment_intent: null | {
    id: string;
    status: string;
    currency: string;
    amount_received: number;
    metadata: StripeSession["metadata"];
    latest_charge: {
      id: string;
      paid: boolean;
      captured: boolean;
      amount_captured: number;
      amount_refunded: number;
      created: number;
      disputed: boolean;
      balance_transaction: { currency: string; fee: number };
    };
  };
};

test(
  "persisted checkout and project credits reconcile signed Stripe events, promotion limits and concurrent retries",
  {
    skip: process.env.RUN_DATABASE_TESTS !== "1",
    timeout: 45000,
  },
  async () => {
    const url = new URL(process.env.DATABASE_URL!);
    assert.equal(url.pathname, "/my_impact_director_validation");
    const tag = "assessment-qa-" + randomUUID();
    const env = {
      REVIEWS_ENABLED: "true",
      VERCEL_ENV: "preview",
      VERCEL_TARGET_ENV: "preview",
      ASSESSMENT_CHECKOUT_SANDBOX: "true",
      ASSESSMENT_STRIPE_ACCOUNT: "acct_assessmentfixture",
      ASSESSMENT_STRIPE_SECRET_KEY: "sk_test_contract_only",
      ASSESSMENT_STRIPE_PUBLISHABLE_KEY: "pk_test_contract_only",
      ASSESSMENT_STRIPE_WEBHOOK_SECRET: "whsec_contract_only",
      ASSESSMENT_STRIPE_ADVANCED_PRICE: "price_advanced",
      ASSESSMENT_STRIPE_ULTIMATE_PRICE: "price_ultimate",
      ASSESSMENT_STRIPE_HUMAN_PRICE: "price_human",
    };
    const before = Object.fromEntries(
      Object.keys(env).map((key) => [key, process.env[key]]),
    );
    Object.assign(process.env, env);
    const sessions = new Map<string, StripeSession>();
    const attempts = new Map<string, string>();
    const creating = new Set<string>();
    const disputes = new Map<string, object[]>();
    const activeCodes = new Map([
      ["promo_first", { code: "QA50", max: 2 }],
      ["promo_last", { code: "QALAST", max: 1 }],
    ]);
    let stripeCreates = 0;
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async (input, options) => {
      const endpoint = new URL(String(input));
      assert.equal(endpoint.origin, "https://api.stripe.com");
      assert.equal(
        new Headers(options?.headers).get("authorization"),
        "Bearer " + env.ASSESSMENT_STRIPE_SECRET_KEY,
      );
      const path = endpoint.pathname.replace("/v1/", "");
      if (path === "account")
        return Response.json({
          id: env.ASSESSMENT_STRIPE_ACCOUNT,
          charges_enabled: true,
        });
      if (path.startsWith("prices/price_")) {
        const tier = path.slice("prices/price_".length) as AssessmentTier;
        return Response.json({
          id: "price_" + tier,
          currency: "gbp",
          active: true,
          type: "one_time",
          livemode: false,
          unit_amount: assessmentPrices[tier],
          product: {
            id: "prod_" + tier,
            active: true,
            metadata: { mid_assessment_tier: tier },
          },
        });
      }
      if (path.startsWith("promotion_codes/")) {
        const id = path.split("/").at(-1)!;
        const promo = activeCodes.get(id)!;
        return Response.json({
          id,
          active: true,
          livemode: false,
          code: promo.code,
          max_redemptions: promo.max,
          times_redeemed: 0,
          coupon: {
            valid: true,
            duration: "once",
            currency: "gbp",
            amount_off: 5000,
            applies_to: { products: ["prod_human"] },
          },
        });
      }
      if (path === "checkout/sessions") {
        const key = new Headers(options?.headers).get("idempotency-key")!;
        const prior = attempts.get(key);
        if (prior) return Response.json(sessions.get(prior));
        if (creating.has(key))
          return Response.json(
            { error: { code: "idempotency_key_in_use" } },
            { status: 409 },
          );
        creating.add(key);
        await new Promise((resolve) => setTimeout(resolve, 80));
        creating.delete(key);
        const id = "cs_test_" + ++stripeCreates;
        const params = options?.body as URLSearchParams;
        const amount =
          Number(params.get("line_items[0][price_data][unit_amount]")) ||
          assessmentPrices[
            params
              .get("line_items[0][price]")!
              .replace("price_", "") as AssessmentTier
          ];
        const discount = params.has("discounts[0][promotion_code]") ? 5000 : 0;
        const metadata = {
          payment_type: params.get("metadata[payment_type]")!,
          assessment_order: params.get("metadata[assessment_order]")!,
        };
        assert.equal(params.get("adaptive_pricing[enabled]"), "false");
        const session = {
          id,
          metadata,
          client_secret: id + "_secret_fixture",
          currency: "gbp",
          livemode: false,
          mode: "payment",
          status: "open",
          payment_status: "unpaid",
          payment_intent: null,
          amount_total: amount - discount,
          total_details: { amount_discount: discount, amount_tax: 0 },
        };
        attempts.set(key, id);
        sessions.set(id, session);
        return Response.json(session);
      }
      if (path.startsWith("checkout/sessions/")) {
        return Response.json(sessions.get(path.split("/").at(-1)!));
      }
      if (path === "disputes") {
        return Response.json({
          has_more: false,
          data:
            disputes.get(endpoint.searchParams.get("payment_intent")!) || [],
        });
      }
      throw new Error("Unexpected Stripe path " + path);
    };

    async function reviewer(
      suffix: string,
      framework = "claims",
      existingUser?: Identity,
    ) {
      const user = existingUser ?? {
        id: tag + "-" + suffix,
        email: suffix + "@example.invalid",
        emailVerified: true,
        name: "QA",
        founder: false,
      };
      const report = randomUUID();
      const review = randomUUID();
      if (!existingUser) {
        await query(
          "INSERT INTO director.users(id,email,name,email_verified_at) VALUES($1,$2,'QA',now())",
          [user.id, user.email],
        );
      }
      await query(
        "INSERT INTO director.reports(id,owner_id,title,sha256,file_bytes,consent_version) VALUES($1::uuid,$2,'Commerce fixture',$1::uuid::text,$3,'qa')",
        [report, user.id, Buffer.from("fixture")],
      );
      await query(
        "INSERT INTO director.reviews(id,report_id,version,framework,status,result) VALUES($1,$2,'qa',$3,'complete',$4)",
        [
          review,
          report,
          framework,
          JSON.stringify({ scores: { [framework]: {} } }),
        ],
      );
      return { user, review, report };
    }

    async function signedEvent(
      type: string,
      object: object,
      eventId = "evt_" + randomUUID().replaceAll("-", ""),
      valid = true,
    ) {
      const body = JSON.stringify({
        id: eventId,
        type,
        livemode: false,
        data: { object },
      });
      const seconds = Math.floor(Date.now() / 1000);
      const signature = createHmac(
        "sha256",
        valid ? env.ASSESSMENT_STRIPE_WEBHOOK_SECRET : "other",
      )
        .update(seconds + "." + body)
        .digest("hex");
      return webhook(
        new Request("http://localhost/api/assessment-checkout/webhook", {
          method: "POST",
          headers: { "stripe-signature": "t=" + seconds + ",v1=" + signature },
          body,
        }),
      );
    }

    type Order = Awaited<ReturnType<typeof openAssessmentOrder>>;
    function processorSession(order: Order) {
      assert.ok("id" in order);
      const session = [...sessions.values()].find(
        (entry) => entry.metadata.assessment_order === order.id,
      );
      assert.ok(session);
      return session;
    }
    async function capture(order: Order) {
      const session = processorSession(order);
      const id = "pi_" + session.id.slice("cs_test_".length);
      session.status = "complete";
      session.payment_status = "paid";
      session.payment_intent = {
        id,
        status: "succeeded",
        currency: "gbp",
        amount_received: session.amount_total,
        metadata: session.metadata,
        latest_charge: {
          id: "ch_" + id.slice(3),
          paid: true,
          captured: true,
          amount_captured: session.amount_total,
          amount_refunded: 0,
          created: Math.floor(Date.now() / 1000),
          disputed: false,
          balance_transaction: { currency: "gbp", fee: 40 },
        },
      };
      const object = { id: session.id, metadata: session.metadata };
      assert.equal(
        (
          await signedEvent(
            "checkout.session.completed",
            object,
            undefined,
            false,
          )
        ).status,
        400,
      );
      const eventId = "evt_" + randomUUID().replaceAll("-", "");
      const [first, duplicate] = await Promise.all([
        signedEvent("checkout.session.completed", object, eventId),
        signedEvent("checkout.session.completed", object, eventId),
      ]);
      for (const result of [first, duplicate])
        assert.equal(result.status, 200, await result.text());
      return session.payment_intent;
    }

    try {
      const fixture = await reviewer("main");
      await query(
        "INSERT INTO director.completed_reports(report_id,owner_id) VALUES($1,$2)",
        [fixture.report, fixture.user.id],
      );
      const document = await PDFDocument.create();
      document.addPage();
      const upload = Buffer.from(await document.save());
      await assert.rejects(
        createReview(
          fixture.user,
          upload,
          "Second assessment.pdf",
          true,
          false,
          null,
          true,
        ),
        {
          code: "REVIEW_ALLOWANCE",
        },
      );
      for (let i = 0; i < 2; i++) {
        await query(
          "INSERT INTO director.completed_reports(report_id,owner_id) VALUES($1,$2)",
          [randomUUID(), fixture.user.id],
        );
      }
      assert.ok(
        (
          await createReview(
            { ...fixture.user, founder: true },
            upload,
            "Internal assessment.pdf",
            true,
            false,
            null,
            true,
          )
        ).id,
      );
      const otherFramework = await reviewer(
        "same-owner",
        "excellence",
        fixture.user,
      );
      const otherOwner = await reviewer("foreign");
      const internal = { ...fixture.user, founder: true };
      assert.deepEqual(
        await openAssessmentOrder(internal, {
          review: fixture.review,
          tier: "human",
          due: 0,
        }),
        { internal: true, tier: "human" },
      );
      await assert.rejects(
        quoteAssessmentOrder(otherOwner.user, {
          review: fixture.review,
          tier: "advanced",
        }),
        { status: 404 },
      );
      await assert.rejects(
        openAssessmentOrder(fixture.user, {
          review: fixture.review,
          tier: "advanced",
          due: 1,
        }),
        { status: 409 },
      );
      await assert.rejects(
        manageAssessmentCommerce(fixture.user, {
          action: "redeem",
          id: randomUUID(),
          projectRef: "INV-100",
          projectFee: 100000,
          commissionedAt: new Date().toISOString(),
        }),
        { status: 403 },
      );

      for (const [code, stripeCodeId, limit] of [
        ["QA50", "promo_first", 2],
        ["QALAST", "promo_last", 1],
      ] as const) {
        await manageAssessmentCommerce(internal, {
          action: "promotion",
          code,
          stripeCodeId,
          limit,
          discount: 5000,
          starts: new Date(Date.now() - 60_000).toISOString(),
          ends: null,
          eligibility: "first_human_purchase",
          active: true,
        });
      }

      const [advanced, retry] = await Promise.all([
        openAssessmentOrder(fixture.user, {
          review: fixture.review,
          tier: "advanced",
          due: 1900,
        }),
        openAssessmentOrder(fixture.user, {
          review: fixture.review,
          tier: "advanced",
          due: 1900,
        }),
      ]);
      assert.ok("id" in advanced && "id" in retry);
      assert.equal(advanced.id, retry.id);
      assert.equal(stripeCreates, 1);
      assert.equal(
        await assessmentLevel(fixture.user, fixture.review),
        "everyday",
      );
      assert.equal(
        (await assessmentOrderStatus(fixture.user, advanced.id!)).state,
        "open",
      );
      await assert.rejects(
        assessmentOrderStatus(otherOwner.user, advanced.id!),
        { status: 404 },
      );
      await assert.rejects(
        openAssessmentOrder(fixture.user, {
          review: fixture.review,
          tier: "ultimate",
          due: 2900,
        }),
        { status: 409 },
      );
      await capture(advanced);
      assert.equal(
        (await assessmentOrderStatus(fixture.user, advanced.id!)).state,
        "paid",
      );
      assert.equal(
        (
          await quoteAssessmentOrder(otherFramework.user, {
            review: otherFramework.review,
            tier: "ultimate",
          })
        ).quote?.due,
        2900,
      );

      const ultimate = await openAssessmentOrder(fixture.user, {
        review: fixture.review,
        tier: "ultimate",
        due: 1000,
      });
      await capture(ultimate);
      const humanQuote = await quoteAssessmentOrder(fixture.user, {
        review: fixture.review,
        tier: "human",
        promotion: "QA50",
      });
      assert.equal(humanQuote.quote?.due, 7000);
      const human = await openAssessmentOrder(fixture.user, {
        review: fixture.review,
        tier: "human",
        due: 7000,
        promotion: "QA50",
      });
      const humanIntent = await capture(human);
      assert.equal(
        await assessmentLevel(fixture.user, fixture.review),
        "human",
      );
      const [credit] = (await customerProjectCredits(fixture.user)) as {
        id: string;
        available_pence: number;
        status: string;
      }[];
      assert.equal(credit.available_pence, 9900);
      assert.equal(credit.status, "available");
      assert.deepEqual(await customerProjectCredits(otherOwner.user), []);
      await assert.rejects(
        quoteAssessmentOrder(otherFramework.user, {
          review: otherFramework.review,
          tier: "human",
          promotion: "QA50",
        }),
        { status: 409 },
      );

      const redemption = {
        action: "redeem",
        id: credit.id,
        projectRef: "INV-100",
        commissionedAt: new Date().toISOString(),
        projectFee: 100000,
      } as const;
      const [redeemed, duplicate] = await Promise.allSettled([
        manageAssessmentCommerce(internal, redemption),
        manageAssessmentCommerce(internal, redemption),
      ]);
      const success = [redeemed, duplicate].find(
        (item) => item.status === "fulfilled",
      );
      assert.deepEqual(success?.value, { applied: 9900, remaining: 90100 });
      assert.equal(
        [redeemed, duplicate].filter((item) => item.status === "rejected")
          .length,
        1,
      );

      humanIntent.latest_charge.disputed = true;
      disputes.set(humanIntent.id, [
        { status: "needs_response", currency: "gbp", amount: 7000 },
      ]);
      assert.equal(
        (
          await signedEvent("charge.dispute.created", {
            payment_intent: humanIntent.id,
          })
        ).status,
        200,
      );
      assert.equal(
        (await customerProjectCredits(fixture.user))[0].status,
        "reconcile",
      );
      assert.equal(
        await assessmentLevel(fixture.user, fixture.review),
        "ultimate",
      );
      disputes.set(humanIntent.id, [
        { status: "lost", currency: "gbp", amount: 7000 },
      ]);
      assert.equal(
        (
          await signedEvent("charge.dispute.closed", {
            payment_intent: humanIntent.id,
          })
        ).status,
        200,
      );
      assert.equal(
        await assessmentLevel(fixture.user, fixture.review),
        "ultimate",
      );

      disputes.set(humanIntent.id, [
        { status: "won", currency: "gbp", amount: 7000 },
      ]);
      assert.equal(
        (
          await signedEvent("charge.dispute.closed", {
            payment_intent: humanIntent.id,
          })
        ).status,
        200,
      );
      assert.equal(
        (await customerProjectCredits(fixture.user))[0].status,
        "redeemed",
      );
      humanIntent.latest_charge.amount_refunded = 7000;
      assert.equal(
        (
          await signedEvent("charge.refunded", {
            payment_intent: humanIntent.id,
          })
        ).status,
        200,
      );
      assert.equal(
        (await customerProjectCredits(fixture.user))[0].status,
        "reconcile",
      );
      assert.equal(
        await assessmentLevel(fixture.user, fixture.review),
        "ultimate",
      );

      const directUltimate = await reviewer("ultimate-direct");
      const directUltimateOrder = await openAssessmentOrder(
        directUltimate.user,
        {
          review: directUltimate.review,
          tier: "ultimate",
          due: 2900,
        },
      );
      await capture(directUltimateOrder);
      assert.equal(
        await assessmentLevel(directUltimate.user, directUltimate.review),
        "ultimate",
      );

      const advancedOnly = await reviewer("advanced-to-human");
      const advancedOnlyOrder = await openAssessmentOrder(advancedOnly.user, {
        review: advancedOnly.review,
        tier: "advanced",
        due: 1900,
      });
      await capture(advancedOnlyOrder);
      const humanFromAdvanced = await openAssessmentOrder(advancedOnly.user, {
        review: advancedOnly.review,
        tier: "human",
        promotion: "QA50",
        due: 8000,
      });
      await capture(humanFromAdvanced);
      assert.equal(
        (await customerProjectCredits(advancedOnly.user))[0].available_pence,
        9900,
      );
      const upgrade = await assessmentCommerceOverview();
      assert.equal(
        upgrade.promotions.find((row) => row.code === "QA50")?.redeemed,
        2,
      );

      const direct = await openAssessmentOrder(otherOwner.user, {
        review: otherOwner.review,
        tier: "human",
        due: 14900,
      });
      await capture(direct);
      assert.equal(
        (await customerProjectCredits(otherOwner.user))[0].available_pence,
        14900,
      );
      const one = (await customerProjectCredits(advancedOnly.user))[0];
      const two = (await customerProjectCredits(otherOwner.user))[0];
      const project = {
        action: "redeem",
        projectRef: "INV-CAPPED",
        projectFee: 10000,
        commissionedAt: new Date().toISOString(),
      } as const;
      assert.deepEqual(
        await manageAssessmentCommerce(internal, {
          ...project,
          id: String(one.id),
        }),
        { applied: 9900, remaining: 100 },
      );
      assert.deepEqual(
        await manageAssessmentCommerce(internal, {
          ...project,
          id: String(two.id),
          projectRef: "inv-capped",
        }),
        { applied: 100, remaining: 0 },
      );

      const candidates = await Promise.all([
        reviewer("last-a"),
        reviewer("last-b"),
      ]);
      const finalOffers = await Promise.allSettled(
        candidates.map((candidate) =>
          openAssessmentOrder(candidate.user, {
            review: candidate.review,
            tier: "human",
            due: 9900,
            promotion: "QALAST",
          }),
        ),
      );
      assert.equal(
        finalOffers.filter((entry) => entry.status === "fulfilled").length,
        1,
      );
      const overview = await assessmentCommerceOverview();
      const active = overview.promotions.find((row) => row.code === "QALAST");
      assert.equal(active?.reserved, 1);
      const seeded = overview.promotions.find(
        (row) => row.code === "FOUNDING50",
      );
      assert.equal(seeded?.max_redemptions, 20);
      assert.equal(seeded?.active, false);
    } finally {
      globalThis.fetch = originalFetch;
      await query(
        `DELETE FROM director.assessment_project_redemptions r USING director.assessment_project_credits c WHERE r.credit_id=c.id AND c.owner_id LIKE $1`,
        [tag + "%"],
      );
      await query(
        "DELETE FROM director.assessment_project_credits WHERE owner_id LIKE $1",
        [tag + "%"],
      );
      await query(
        `DELETE FROM director.assessment_payment_events e USING director.assessment_orders o WHERE e.order_id=o.id AND o.owner_id LIKE $1`,
        [tag + "%"],
      );
      await query(
        "DELETE FROM director.assessment_orders WHERE owner_id LIKE $1",
        [tag + "%"],
      );
      await query(
        "DELETE FROM director.assessment_promotions WHERE code IN ('QA50','QALAST')",
      );
      await query("DELETE FROM director.audit WHERE actor_id LIKE $1", [
        tag + "%",
      ]);
      await query("DELETE FROM director.reports WHERE owner_id LIKE $1", [
        tag + "%",
      ]);
      await query("DELETE FROM director.users WHERE id LIKE $1", [tag + "%"]);
      await database().end();
      for (const [key, value] of Object.entries(before)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  },
);
