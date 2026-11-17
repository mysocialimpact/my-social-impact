import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { database, query } from "../src/lib/db";
import {
  createGuest,
  localIdentity,
  privateNetworkKey,
} from "../src/lib/access";
import {
  accountAction,
  visitor,
  passwordResetAvailable,
} from "../src/lib/auth";
import { POST as uploadStart } from "../src/app/api/uploads/route";
import { POST as discoveryStart } from "../src/app/api/discovery/route";
import { POST as legacyUpload } from "../src/app/api/reviews/route";
import { POST as assessmentStart } from "../src/app/api/reviews/[id]/route";
import { POST as uploadFinish } from "../src/app/api/uploads/[id]/route";
import { requestEmailSave, redeemEmailLink } from "../src/lib/email-save";
import { createReview, getReview, startFramework } from "../src/lib/reviews";
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
test(
  "password login migrates only proven workspaces, preserves guests and never trusts an email claim alone",
  { skip: process.env.RUN_DATABASE_TESTS !== "1", timeout: 120000 },
  async () => {
    assert.equal(
      new URL(process.env.DATABASE_URL!).pathname,
      "/my_impact_director_validation",
    );
    process.env.APP_ORIGIN = "https://test.example";
    process.env.ACCOUNT_ORIGIN = "https://account.example.invalid";
    process.env.REVIEWS_ENABLED = "true";
    process.env.EMAIL_ENABLED = "true";
    process.env.EMAIL_FROM = "QA <qa@example.invalid>";
    process.env.RESEND_API_KEY = "synthetic-only";
    const prefix = "password-qa-" + randomUUID(),
      ip = prefix;
    const profiles: Record<
      string,
      { id: string; email: string; name: string }
    > = {
      a: { id: prefix + "-a", email: prefix + "@example.invalid", name: "QA" },
      b: { id: prefix + "-b", email: prefix + "@example.invalid", name: "QA" },
      c: {
        id: prefix + "-c",
        email: prefix + "-new@example.invalid",
        name: "QA",
      },
    };
    let chosen = "a";
    const users: string[] = Object.values(profiles).map((p) => p.id),
      emails: any[] = [],
      actions: string[] = [],
      original = globalThis.fetch;
    const req = (cookie = "") =>
      new Request("https://test.example/api/account", {
        method: "POST",
        headers: {
          origin: "https://test.example",
          cookie,
          "x-forwarded-for": ip,
        },
      });
    const cookie = (r: Response) =>
      r.headers
        .getSetCookie()
        .find((c) => c.startsWith("msi_sorp_session="))!
        .split(";")[0];
    const pdf = await PDFDocument.create();
    pdf.addPage();
    const bytes = Buffer.from(await pdf.save());
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      if (
        url.startsWith("https://account.example.invalid/api/readiness-account")
      ) {
        if (url.includes("feature=password-reset"))
          return Response.json({ available: true });
        if (init?.method === "POST") {
          const data = JSON.parse(String(init.body));
          if (data.action === "request-reset")
            assert.equal(data.product, "my-impact-director");
          actions.push(data.action);
          return Response.json(
            { ok: true },
            {
              headers:
                data.action === "login" || data.action === "signup"
                  ? {
                      "set-cookie": `msi_sorp_session=${chosen}; HttpOnly; Path=/; SameSite=Lax`,
                    }
                  : {},
            },
          );
        }
        const h = new Headers(init?.headers),
          key = /msi_sorp_session=([abcd])/.exec(h.get("cookie") || "")?.[1];
        assert.ok(key);
        return Response.json({ signedIn: true, account: profiles[key] });
      }
      if (url === "https://api.resend.com/emails") {
        emails.push(JSON.parse(String(init?.body)));
        return Response.json({ id: "qa-" + emails.length });
      }
      throw Error("Unexpected external request");
    };
    async function guestReport() {
      const g = await createGuest(req());
      users.push(g.user.id);
      const doc = await createReview(
        g.user,
        bytes,
        "source.pdf",
        true,
        false,
        null,
        true,
      );
      return { ...g, cookie: g.cookie!.split(";")[0], doc };
    }
    try {
      const a = await guestReport();
      await query(
        "UPDATE director.reviews SET status='complete',result='null'::jsonb WHERE id=$1",
        [a.doc.id],
      );
      const unshared = await createReview(
        a.user,
        Buffer.concat([bytes, Buffer.from("\n% separate private source")]),
        "unshared.pdf",
        true,
        false,
        null,
        true,
      );
      const preclaimed = await visitor(req("msi_sorp_session=b"));
      assert.equal(preclaimed.emailVerified, false);
      await requestEmailSave(req(a.cookie), {
        email: profiles.a.email,
        reviewId: a.doc.id,
      });
      const token = emails.at(-1).text.match(/access#([A-Za-z0-9_-]{43})/)[1],
        verified = await redeemEmailLink(token),
        emailCookie = verified.cookie.split(";")[0];
      const legacy = await localIdentity(req(emailCookie));
      users.push(legacy!.id);
      assert.equal(legacy!.emailVerified, true);
      await assert.rejects(
        () => getReview(legacy!, unshared.id),
        { status: 404 },
        "a report email must not share other guest documents",
      );
      assert.notEqual(
        legacy!.id,
        profiles.b.id,
        "an email proof cannot activate a preclaimed unverified password account",
      );
      assert.equal(
        (await visitor(req("msi_sorp_session=b"))).emailVerified,
        false,
      );
      await assert.rejects(() => getReview(preclaimed, a.doc.id), {
        status: 404,
      });
      const deliveries = (
        await query<{ n: string }>(
          "SELECT count(*) AS n FROM director.report_deliveries WHERE review_id=$1",
          [a.doc.id],
        )
      )[0].n;
      assert.equal(
        deliveries,
        "0",
        "document preparation alone must not queue a nonexistent detailed PDF",
      );
      const signed = await accountAction(req(), {
        action: "login",
        email: profiles.a.email,
        password: "synthetic-long-password",
      });
      const needsProof = await visitor(req(cookie(signed)));
      assert.equal(needsProof.emailVerified, false);
      await assert.rejects(() => getReview(needsProof, a.doc.id), {
        status: 404,
      });
      await requestEmailSave(req(cookie(signed)), {
        email: profiles.a.email,
        account: true,
      });
      const bindToken = emails
        .at(-1)
        .text.match(/access#([A-Za-z0-9_-]{43})/)[1];
      await redeemEmailLink(bindToken, req(cookie(signed)));
      assert.equal(signed.status, 200);
      const fresh = await visitor(req(cookie(signed)));
      assert.equal(fresh.emailVerified, true);
      assert.equal(fresh.passwordAccount, true);
      const subscriptionsBefore = (
        await query<{ n: string }>(
          "SELECT count(*) AS n FROM director.report_subscriptions WHERE report_id=(SELECT report_id FROM director.reviews WHERE id=$1)",
          [a.doc.id],
        )
      )[0].n;
      await startFramework(fresh, a.doc.id, "claims");
      assert.equal(
        (
          await query<{ n: string }>(
            "SELECT count(*) AS n FROM director.report_subscriptions WHERE report_id=(SELECT report_id FROM director.reviews WHERE id=$1)",
            [a.doc.id],
          )
        )[0].n,
        subscriptionsBefore,
        "account migration does not duplicate email subscriptions",
      );
      assert.equal((await getReview(fresh, a.doc.id)).id, a.doc.id);
      assert.equal(
        (
          await query<{ n: string }>(
            "SELECT count(*) AS n FROM director.report_deliveries WHERE review_id=$1",
            [a.doc.id],
          )
        )[0].n,
        deliveries,
        "migration does not resend reports",
      );
      profiles.d = {
        id: prefix + "-d",
        email: profiles.a.email,
        name: "Migrated account",
      };
      users.push(profiles.d.id);
      chosen = "d";
      const migrated = await accountAction(req(emailCookie), {
        action: "login",
        email: profiles.d.email,
        password: "synthetic-long-password",
      });
      const migratedFresh = await visitor(req(cookie(migrated)));
      assert.equal(migratedFresh.emailVerified, true);
      assert.equal((await getReview(migratedFresh, a.doc.id)).id, a.doc.id);
      chosen = "b";
      const stranger = await visitor(req("msi_sorp_session=b"));
      assert.equal(stranger.emailVerified, false);
      await assert.rejects(() => getReview(stranger, a.doc.id), {
        status: 404,
      });
      profiles.b.email = prefix + "-other@example.invalid";
      const mixed = await visitor(req("msi_sorp_session=b; " + emailCookie));
      assert.equal(mixed.emailVerified, false);
      await assert.rejects(() => getReview(mixed, a.doc.id), { status: 404 });
      const b = await guestReport();
      chosen = "a";
      const returning = await accountAction(req(b.cookie), {
        action: "login",
        email: profiles.a.email,
        password: "synthetic-long-password",
      });
      assert.equal(returning.status, 200);
      const returned = await visitor(req(cookie(returning)));
      assert.equal(
        (await getReview(returned, b.doc.id)).id,
        b.doc.id,
        "password login keeps this browser’s guest document",
      );
      const c = await guestReport();
      chosen = "c";
      const newAccount = await accountAction(req(c.cookie), {
        action: "signup",
        email: profiles.c.email,
        name: "Synthetic QA",
        password: "Eight8!x",
      });
      assert.equal(newAccount.status, 200);
      const newCookie = cookie(newAccount),
        unverified = await visitor(req(newCookie));
      // Every public path into new processing must reject a guest before counters or model work.
      const gateRequest = (
        path: string,
        cookieValue: string,
        data: unknown = {},
      ) =>
        new Request("https://test.example" + path, {
          method: "POST",
          headers: {
            origin: "https://test.example",
            cookie: cookieValue,
            "content-type": "application/json",
          },
          body: JSON.stringify(data),
        });
      for (const [handler, path, data] of [
        [
          uploadStart,
          "/api/uploads",
          { name: "new.pdf", size: 100, consent: true },
        ],
        [
          discoveryStart,
          "/api/discovery",
          { action: "search", organisation: "Example" },
        ],
        [legacyUpload, "/api/reviews", {}],
      ] as const) {
        const response = await handler(gateRequest(path, c.cookie, data));
        assert.equal(response.status, 401);
        assert.equal((await response.json()).code, "ACCOUNT_REQUIRED");
      }
      for (const data of [{ framework: "claims" }, {}]) {
        const response = await assessmentStart(
          gateRequest("/api/reviews/" + c.doc.id, c.cookie, data),
          { params: Promise.resolve({ id: c.doc.id }) },
        );
        assert.equal(response.status, 401);
        assert.equal((await response.json()).code, "ACCOUNT_REQUIRED");
      }
      const finishBlocked = await uploadFinish(
        gateRequest("/api/uploads/" + randomUUID(), c.cookie, {
          consent: true,
          qualityConsent: false,
        }),
        { params: Promise.resolve({ id: randomUUID() }) },
      );
      assert.equal(finishBlocked.status, 401);
      const startAllowed = await uploadStart(
        gateRequest("/api/uploads", newCookie, {
          name: "new.pdf",
          size: 100,
          consent: true,
        }),
      );
      assert.equal(startAllowed.status, 201, await startAllowed.clone().text());
      assert.equal(unverified.emailVerified, false);
      await assert.rejects(() => getReview(unverified, c.doc.id), {
        status: 404,
      });
      await requestEmailSave(req(newCookie + "; " + c.cookie), {
        email: profiles.c.email,
        account: true,
      });
      const newToken = emails
          .at(-1)
          .text.match(/access#([A-Za-z0-9_-]{43})/)[1],
        proof = await redeemEmailLink(
          newToken,
          req(newCookie + "; " + c.cookie),
        ),
        proofCookie = proof.cookie.split(";")[0];
      const nowVerified = await visitor(req(newCookie));
      assert.equal(nowVerified.emailVerified, true);
      assert.equal((await getReview(nowVerified, c.doc.id)).id, c.doc.id);
      profiles.c.email = prefix + "-changed@example.invalid";
      const changed = await visitor(req(newCookie + "; " + proofCookie));
      assert.equal(
        changed.emailVerified,
        false,
        "an old email session does not verify a changed email address",
      );
      const before = emails.length;
      await requestEmailSave(req(newCookie + "; " + proofCookie), {
        email: profiles.c.email,
        account: true,
      });
      assert.equal(
        emails.length,
        before + 1,
        "changed address needs new proof",
      );
      assert.equal(await passwordResetAvailable(), true);
      assert.equal(
        (
          await accountAction(req(), {
            action: "request-reset",
            email: profiles.a.email,
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await accountAction(req(), {
            action: "reset-password",
            token: "synthetic-reset-token-123456",
            password: "new-synthetic-password",
          })
        ).status,
        200,
      );
      assert.ok(
        actions.includes("request-reset") && actions.includes("reset-password"),
      );
    } finally {
      globalThis.fetch = original;
      await query(
        "DELETE FROM director.reports WHERE owner_id=ANY($1::text[])",
        [users],
      );
      await query("DELETE FROM director.users WHERE id=ANY($1::text[])", [
        users,
      ]);
      await query(
        "DELETE FROM director.rate_limits WHERE key=ANY($1::text[])",
        [
          [
            hash("auth-ip:" + ip),
            ...Object.values(profiles).map((p) =>
              hash("auth-email:" + p.email),
            ),
            hash("visitor-v2:" + privateNetworkKey(req())),
            hash("email-ip:" + privateNetworkKey(req())),
            ...Object.values(profiles).map((p) =>
              hash("email-recipient:" + p.email),
            ),
          ],
        ],
      );
      await database().end();
    }
  },
);
