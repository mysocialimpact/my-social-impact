import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import { GET as adminContributions } from "../src/app/api/admin/contributions/route";
import { POST as webhook } from "../src/app/api/contributions/webhook/route";
import { database, query } from "../src/lib/db";
import {
  contributionReview,
  openContribution,
  ownedContribution,
  refreshContribution,
  cancelContribution,
  processContributionEvent,
  supportSummary,
} from "../src/lib/contributions";
import type { Identity } from "../src/lib/auth";

test(
  "contribution ledger: idempotency, ownership, interruptions, authoritative status, webhook retries and refunds",
  { skip: process.env.RUN_DATABASE_TESTS !== "1", timeout: 60000 },
  async () => {
    assert.equal(
      new URL(process.env.DATABASE_URL!).pathname,
      "/my_impact_director_validation",
    );
    const originalFetch = globalThis.fetch;
    const prefix = "support-qa-" + randomUUID();
    const users: Identity[] = [0, 1].map((i) => ({
      id: prefix + i,
      email: `${prefix}${i}@example.invalid`,
      name: "Fictional support QA",
      founder: false,
      anonymous: i === 1,
      emailVerified: i === 0,
    }));
    const ids: string[] = [];
    const sessions = new Map<string, any>();
    const byKey = new Map<string, any>();
    let interrupt = false;
    let providerDown = false;
    let founderAccess = false;
    let createdFounder = false;
    let counter = 0;
    const createdParams: URLSearchParams[] = [];
    Object.assign(process.env, {
      CONTRIBUTIONS_ENABLED: "true",
      STRIPE_SECRET_KEY: "sk_test_fixture",
      STRIPE_PUBLISHABLE_KEY: "pk_test_fixture",
      STRIPE_WEBHOOK_SECRET: "whsec_fixture",
      CONTRIBUTIONS_STRIPE_ACCOUNT_ID: "acct_fixture",
      CONTRIBUTIONS_MERCHANT_NAME: "Fictional QA merchant",
      VERCEL_ENV: "preview",
    });
    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      if (url.includes("/api/readiness-account"))
        return Response.json({
          signedIn: true,
          account: {
            id: users[0].id,
            email: users[0].email,
            name: users[0].name,
          },
          platformAccess: { founder: founderAccess },
        });
      assert.ok(
        url.startsWith("https://api.stripe.com/v1/"),
        "No external request except the mocked Stripe contract",
      );
      if (url.endsWith("/account"))
        return Response.json({
          id: "acct_fixture",
          charges_enabled: true,
          company: { name: "Fictional QA Merchant Ltd" },
        });
      if (url.endsWith("/checkout/sessions")) {
        const key = new Headers(init?.headers).get("Idempotency-Key")!;
        const p = new URLSearchParams(init?.body as string);
        let session = byKey.get(key);
        if (!session) {
          counter++;
          createdParams.push(p);
          const n = String(counter);
          session = {
            id: "cs_test_fixture" + n,
            client_secret: "fixture_not_a_real_secret",
            amount_total: Number(
              p.get("line_items[0][price_data][unit_amount]"),
            ),
            currency: "gbp",
            livemode: false,
            status: "open",
            payment_status: "unpaid",
            metadata: {
              product: p.get("metadata[product]"),
              payment_type: p.get("metadata[payment_type]"),
              contribution_id: p.get("metadata[contribution_id]"),
            },
            payment_intent: {
              id: "pi_fixture" + n,
              status: "requires_payment_method",
              latest_charge: { amount_refunded: 0 },
            },
          };
          sessions.set(session.id, session);
          byKey.set(key, session);
        }
        if (interrupt) {
          interrupt = false;
          throw Error("Simulated response lost after session creation");
        }
        return Response.json(session);
      }
      if (providerDown) throw Error("Simulated temporary provider outage");
      const id = url.split("/checkout/sessions/")[1]?.split(/[?/]/)[0];
      const session = sessions.get(id);
      assert.ok(session, "Known fixture session");
      if (url.endsWith("/expire")) session.status = "expired";
      return Response.json(session);
    }) as typeof fetch;
    try {
      for (const u of users)
        await query(
          "INSERT INTO director.users(id,email,name,is_anonymous) VALUES($1,$2,$3,$4)",
          [u.id, u.email, u.name, !!u.anonymous],
        );
      const report = randomUUID(),
        review = randomUUID();
      await query(
        "INSERT INTO director.reports(id,owner_id,title,sha256,file_bytes,consent_version) VALUES($1,$2,'Fictional support QA report',$3,$4,'qa')",
        [report, users[0].id, randomUUID(), Buffer.from("%PDF-1.4 fixture")],
      );
      await query(
        "INSERT INTO director.reviews(id,report_id,version,status,framework,result) VALUES($1,$2,'1.0.0-claims','complete','claims','{}')",
        [review, report],
      );
      assert.equal((await supportSummary(users[0], review)).supported, false);
      await assert.rejects(
        () => contributionReview(users[1], review),
        /completed review/,
      );
      for (const amount of ["0", "5.001", "1000.01"])
        await assert.rejects(() =>
          openContribution(users[0], { review, amount, attempt: randomUUID() }),
        );
      assert.equal(counter, 0);
      const attempt = randomUUID();
      const starts = await Promise.all(
        [0, 1, 2].map(() =>
          openContribution(users[0], { review, amount: "5", attempt }),
        ),
      );
      const first = starts[0];
      ids.push(first.id);
      assert.equal(new Set(starts.map((s) => s.id)).size, 1);
      assert.equal(counter, 1);
      assert.equal(createdParams[0].get("customer_email"), users[0].email);
      assert.equal(createdParams[0].get("redirect_on_completion"), "never");
      assert.equal(
        createdParams[0].get("metadata[payment_type]"),
        "voluntary_support",
      );
      assert.equal(createdParams[0].get("mode"), "payment");
      await assert.rejects(
        () =>
          openContribution(users[0], {
            review,
            amount: "10",
            attempt: randomUUID(),
          }),
        /already open/,
      );
      await assert.rejects(
        () => ownedContribution(users[1], first.id),
        /unavailable/,
      );
      const row = await ownedContribution(users[0], first.id),
        session = sessions.get(row.checkout_id!);
      session.status = "complete";
      session.payment_intent.status = "processing";
      assert.equal((await refreshContribution(row)).status, "processing");
      assert.equal((await supportSummary(users[0], review)).supported, false);
      session.payment_status = "paid";
      session.payment_intent.status = "succeeded";
      const event = {
        id: "evt_" + randomUUID().replaceAll("-", ""),
        type: "checkout.session.completed",
        livemode: false,
        data: { object: session },
      };
      const webhookRequest = (body: typeof event, valid = true) => {
        const raw = JSON.stringify(body),
          timestamp = String(Math.floor(Date.now() / 1000));
        const digest = createHmac("sha256", "whsec_fixture")
          .update(timestamp + "." + raw)
          .digest("hex");
        return new Request("https://test.example/api/contributions/webhook", {
          method: "POST",
          headers: {
            "stripe-signature": `t=${timestamp},v1=${valid ? digest : "0".repeat(64)}`,
          },
          body: raw,
        });
      };
      assert.equal((await webhook(webhookRequest(event, false))).status, 400);
      providerDown = true;
      assert.equal((await webhook(webhookRequest(event))).status, 503);
      const [unrecorded] = await query<{ count: string }>(
        "SELECT count(*)::text AS count FROM director.contribution_events WHERE event_id=$1",
        [event.id],
      );
      assert.equal(unrecorded.count, "0");
      providerDown = false;
      assert.equal((await webhook(webhookRequest(event))).status, 200);
      assert.equal((await webhook(webhookRequest(event))).status, 200);
      assert.equal((await refreshContribution(row)).status, "succeeded");
      assert.equal((await supportSummary(users[0], review)).supported, true);
      const [counts] = await query<{ count: string }>(
        "SELECT count(*)::text AS count FROM director.contribution_events WHERE contribution_id=$1",
        [row.id],
      );
      assert.equal(counts.count, "1");
      session.payment_intent.latest_charge.amount_refunded = 200;
      await processContributionEvent({
        ...event,
        id: "evt_partial" + prefix.replaceAll("-", ""),
        type: "charge.refunded",
        data: { object: { payment_intent: session.payment_intent.id } },
      });
      assert.equal(
        (await refreshContribution(row)).status,
        "partially_refunded",
      );
      session.payment_intent.latest_charge.amount_refunded = 500;
      await processContributionEvent({
        ...event,
        id: "evt_refund" + prefix.replaceAll("-", ""),
        type: "charge.refunded",
        data: { object: { payment_intent: session.payment_intent.id } },
      });
      assert.equal((await refreshContribution(row)).status, "refunded");
      assert.equal((await supportSummary(users[0], review)).supported, false);
      session.payment_intent.latest_charge.amount_refunded = 0;
      assert.equal(
        (await refreshContribution(row)).status,
        "refunded",
        "Stale status cannot erase refund",
      );
      const next = await openContribution(users[0], {
        review,
        amount: "10",
        attempt: randomUUID(),
      });
      ids.push(next.id);
      const second = await ownedContribution(users[0], next.id);
      assert.equal((await cancelContribution(second)).status, "cancelled");
      interrupt = true;
      const retryAttempt = randomUUID();
      await assert.rejects(
        () =>
          openContribution(users[0], {
            review,
            amount: "20",
            attempt: retryAttempt,
          }),
        /couldn’t reach Stripe/,
      );
      const recovered = await openContribution(users[0], {
        review,
        amount: "20",
        attempt: retryAttempt,
      });
      ids.push(recovered.id);
      assert.equal(
        counter,
        3,
        "Lost response reused the same Stripe idempotency key",
      );
      const recoveredRow = await ownedContribution(users[0], recovered.id);
      const recoveredSession = sessions.get(recoveredRow.checkout_id!);
      recoveredSession.currency = "usd";
      await assert.rejects(
        () => refreshContribution(recoveredRow),
        /could not be verified/,
      );
      recoveredSession.currency = "gbp";
      await query(
        "INSERT INTO director.review_grants(review_id,owner_id) VALUES($1,$2)",
        [review, users[1].id],
      );
      const anonymous = await openContribution(users[1], {
        review,
        amount: "1",
        attempt: randomUUID(),
      });
      ids.push(anonymous.id);
      assert.equal(
        createdParams.at(-1)!.has("customer_email"),
        false,
        "Unverified/guest email is not reused for receipts",
      );
      assert.equal(
        (
          await adminContributions(
            new Request(
              "https://test.example/api/admin/contributions?mode=test",
            ),
          )
        ).status,
        401,
      );
      const adminRequest = () =>
        new Request("https://test.example/api/admin/contributions?mode=test", {
          headers: { cookie: "msi_sorp_session=fixture" },
        });
      assert.equal((await adminContributions(adminRequest())).status, 403);
      founderAccess = true;
      assert.equal(
        (await adminContributions(adminRequest())).status,
        403,
        "a remote profile founder flag alone grants no administrative access",
      );
      const created = await query(
        "INSERT INTO director.users(id,email,name,email_verified_at,canonical_owner_id) VALUES('founder_marcus_warry',$1,'Validation-only role fixture',now(),'founder_marcus_warry') ON CONFLICT(id) DO NOTHING RETURNING id",
        [users[0].email],
      );
      createdFounder = created.length > 0;
      // Seed an explicit server-managed role for this synthetic ledger fixture.
      await query(
        "UPDATE director.users SET canonical_owner_id='founder_marcus_warry',email_verified_at=now() WHERE id=$1",
        [users[0].id],
      );
      const admin = await adminContributions(adminRequest());
      assert.equal(admin.status, 200);
      const adminData = await admin.json();
      assert.equal(adminData.live, false);
      assert.ok(
        adminData.payments.some((p: { id: string }) => p.id === row.id),
      );
      const [globalTotals] = await query<{ gross: string; refunded: string }>(
        "SELECT COALESCE(sum(amount_pence) FILTER(WHERE paid_at IS NOT NULL),0)::text AS gross,COALESCE(sum(refunded_pence),0)::text AS refunded FROM director.contributions WHERE livemode=false",
      );
      assert.equal(adminData.totals.gross, globalTotals.gross);
      assert.equal(adminData.totals.refunded, globalTotals.refunded);
      process.env.CONTRIBUTIONS_ENABLED = "false";
      assert.equal(
        (
          await refreshContribution(
            await ownedContribution(users[0], recovered.id),
          )
        ).status,
        "failed",
        "Turning off new payments does not disable reconciliation",
      );
      const [totals] = await query<{ gross: string; refunded: string }>(
        "SELECT sum(amount_pence) FILTER(WHERE paid_at IS NOT NULL)::text AS gross,sum(refunded_pence)::text AS refunded FROM director.contributions WHERE owner_id=$1",
        [users[0].id],
      );
      assert.equal(totals.gross, "500");
      assert.equal(totals.refunded, "500");
      await query("DELETE FROM director.reports WHERE id=$1", [report]);
      const [retained] = await query<{
        report_id: string | null;
        review_id: string | null;
        amount_pence: number;
      }>(
        "SELECT report_id,review_id,amount_pence FROM director.contributions WHERE id=$1",
        [row.id],
      );
      assert.equal(retained.report_id, null);
      assert.equal(retained.review_id, null);
      assert.equal(retained.amount_pence, 500);
      console.log(
        "Contribution database contract checks passed; Stripe was simulated, no real test/live charge was made.",
      );
    } finally {
      globalThis.fetch = originalFetch;
      await query(
        "DELETE FROM director.contributions WHERE owner_id=ANY($1::text[])",
        [users.map((x) => x.id)],
      );
      await query(
        "DELETE FROM director.reports WHERE owner_id=ANY($1::text[])",
        [users.map((x) => x.id)],
      );
      await query("DELETE FROM director.users WHERE id=ANY($1::text[])", [
        users.map((x) => x.id),
      ]);
      if (createdFounder)
        await query(
          "DELETE FROM director.users WHERE id='founder_marcus_warry' AND email=$1 AND NOT EXISTS(SELECT 1 FROM director.reports WHERE owner_id='founder_marcus_warry') AND NOT EXISTS(SELECT 1 FROM director.auth_principals WHERE owner_id='founder_marcus_warry')",
          [users[0].email],
        );
      await database().end();
    }
  },
);
