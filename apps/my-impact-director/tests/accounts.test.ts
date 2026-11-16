import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { query, database } from "../src/lib/db";
import { createGuest } from "../src/lib/access";
import { accountAction, visitor } from "../src/lib/auth";
import { requestEmailSave, redeemEmailLink } from "../src/lib/email-save";
import {
  createReview,
  getReview,
  reviewAccess,
  startFramework,
} from "../src/lib/reviews";
import { workspaces } from "../src/lib/workspace";
import { createShare, readShare } from "../src/lib/sharing";
import {
  recordConsent,
  preferences,
  CONSENT_VERSION,
} from "../src/lib/preferences";
import { sendPendingReports } from "../src/lib/report-delivery";
test(
  "password accounts bind verified subjects, adopt only authorised reports, preserve email accounts, preferences and revocable shares",
  { skip: process.env.RUN_DATABASE_TESTS !== "1", timeout: 120000 },
  async (t) => {
    assert.equal(
      new URL(process.env.DATABASE_URL!).pathname,
      "/my_impact_director_validation",
    );
    process.env.APP_ORIGIN = "https://test.example";
    process.env.REVIEWS_ENABLED = "true";
    process.env.EMAIL_ENABLED = "true";
    process.env.EMAIL_FROM = "QA <qa@example.invalid>";
    process.env.RESEND_API_KEY = "contract-only";
    const prefix = "qa-account-" + randomUUID(),
      email = prefix + "@example.invalid",
      subject = prefix + "-password",
      old = "email_" + createHash("sha256").update(email).digest("hex");
    const users = [subject, old],
      reports: string[] = [],
      emails: any[] = [],
      providerCalls: any[] = [],
      original = globalThis.fetch;
    const req = (cookie = "", body?: unknown) =>
      new Request("https://test.example/api/account", {
        method: body ? "POST" : "GET",
        headers: {
          cookie,
          origin: "https://test.example",
          "content-type": "application/json",
          "x-forwarded-for": prefix,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    globalThis.fetch = async (input, init) => {
      if (String(input) === "https://api.resend.com/emails") {
        emails.push(JSON.parse(String(init?.body)));
        return Response.json({ id: "contract-receipt" });
      }
      if (String(input).includes("/api/readiness-account")) {
        if (init?.method === "POST") {
          const b = JSON.parse(String(init.body));
          providerCalls.push(b);
          return Response.json(
            { ok: true },
            {
              headers:
                b.action === "signup" || b.action === "login"
                  ? {
                      "set-cookie":
                        "msi_sorp_session=qa-password; HttpOnly; Secure; SameSite=Lax; Path=/",
                    }
                  : {},
            },
          );
        }
        if (!new Headers(init?.headers).get("cookie")?.includes("qa-password"))
          return Response.json({ signedIn: false }, { status: 401 });
        return Response.json({
          signedIn: true,
          account: { id: subject, email, name: "QA" },
          platformAccess: { founder: false },
        });
      }
      return original(input, init);
    };
    try {
      await query(
        "INSERT INTO director.users(id,email,name,email_verified_at) VALUES($1,$2,'Existing verified email account',now())",
        [old, email],
      );
      const pdf = await PDFDocument.create();
      pdf.addPage().drawText("Explicitly synthetic account migration test");
      const bytes = Buffer.from(await pdf.save());
      const oldUser = {
          id: old,
          email,
          name: "Existing",
          founder: false,
          emailVerified: true,
        },
        historical = await createReview(
          oldUser,
          bytes,
          "historical.pdf",
          true,
          false,
          null,
          true,
        );
      reports.push(historical.id);
      const guest = await createGuest(req());
      users.push(guest.user.id);
      const current = await createReview(
        guest.user,
        bytes,
        "current.pdf",
        true,
        false,
        null,
        true,
      );
      reports.push(current.id);
      const selected = await startFramework(guest.user, current.id, "claims");
      const otherGuest = await createGuest(
        new Request("https://test.example", {
          headers: { "x-forwarded-for": prefix + "-other" },
        }),
      );
      users.push(otherGuest.user.id);
      const foreign = await createReview(
        otherGuest.user,
        bytes,
        "foreign.pdf",
        true,
        false,
        null,
        true,
      );
      reports.push(foreign.id);
      await t.test(
        "matching email alone never grants historical account access",
        async () => {
          const unverified = await visitor(req("msi_sorp_session=qa-password"));
          assert.equal(unverified.emailVerified, false);
          assert.notEqual(unverified.id, old);
          await assert.rejects(() => getReview(unverified, historical.id), {
            status: 404,
          });
        },
      );
      await t.test(
        "registration uses two fields, keeps guest ownership and sends one verification",
        async () => {
          const r = await accountAction(req(guest.cookie!.split(";")[0], {}), {
            action: "signup",
            email,
            password: "synthetic-test-password",
            marketing: true,
          });
          assert.equal(r.status, 200);
          assert.equal((await r.json()).verificationSent, true);
          assert.ok(r.headers.get("set-cookie")?.includes("HttpOnly"));
          assert.equal(providerCalls[0].action, "signup");
          assert.equal(providerCalls[0].organisation, "Not supplied");
          assert.equal(emails.length, 1);
          assert.equal(emails[0].attachments, undefined);
        },
      );
      const token = emails[0].text.match(/access#([A-Za-z0-9_-]{43})/)[1],
        redeemed = await redeemEmailLink(token);
      const signed = await visitor(req("msi_sorp_session=qa-password"));
      await t.test(
        "one verification migrates to existing account across browsers without duplication",
        async () => {
          assert.equal(signed.id, old);
          assert.equal(signed.emailVerified, true);
          assert.equal((await workspaces(signed)).length, 2);
          assert.ok(
            await reviewAccess(signed, await getReview(signed, selected.id)),
          );
          await assert.rejects(() => getReview(signed, foreign.id), {
            status: 404,
          });
          assert.equal(
            (
              await query(
                "SELECT id FROM director.users WHERE lower(email)=$1 AND NOT is_anonymous",
                [email],
              )
            ).length,
            1,
          );
          await assert.rejects(() => redeemEmailLink(token), { status: 410 });
          assert.equal((await preferences(old)).opted_in, true);
        },
      );
      await t.test(
        "normal login does not resend verification; reset stays at the trusted provider",
        async () => {
          const before = emails.length;
          const r = await accountAction(req("", {}), {
            action: "login",
            email,
            password: "synthetic-test-password",
          });
          assert.equal((await r.json()).verified, true);
          assert.equal(emails.length, before);
          await accountAction(req("", {}), { action: "request-reset", email });
          assert.deepEqual(providerCalls.at(-1), {
            action: "request-reset",
            email,
          });
        },
      );
      const fixture = JSON.parse(
        await readFile("artifacts/claims-review.json", "utf8"),
      );
      await query(
        "UPDATE director.reviews SET status='complete',result=$2 WHERE id=$1",
        [selected.id, JSON.stringify(fixture.result)],
      );
      await t.test(
        "automatic delivery includes a PDF and a durable password login",
        async () => {
          await query(
            "INSERT INTO director.report_deliveries(review_id,owner_id,email) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
            [selected.id, old, email],
          );
          await sendPendingReports();
          const mail = emails.find((m) => m.attachments);
          assert.ok(mail);
          assert.equal(
            Buffer.from(mail.attachments[0].content, "base64")
              .subarray(0, 5)
              .toString(),
            "%PDF-",
          );
          assert.match(mail.text, /Log in with your email and password/);
        },
      );
      await t.test(
        "sharing is explicit, hides the original document and can be revoked",
        async () => {
          await assert.rejects(
            () => createShare({ ...signed, emailVerified: false }, selected.id),
            { status: 403 },
          );
          await assert.rejects(
            () =>
              createShare(
                {
                  ...signed,
                  id: otherGuest.user.id,
                  accessIds: [otherGuest.user.id],
                },
                selected.id,
              ),
            { status: 404 },
          );
          const share = await createShare(signed, selected.id),
            secret = share.url.split("#")[1];
          assert.equal(share.url.split("#")[0], "https://test.example/shared");
          const publicView = await readShare(secret);
          assert.deepEqual(Object.keys(publicView).sort(), ["result", "title"]);
          await query(
            "UPDATE director.assessment_shares SET revoked_at=now() WHERE id=$1 AND owner_id=$2",
            [share.id, old],
          );
          await assert.rejects(() => readShare(secret), { status: 404 });
        },
      );
      await t.test(
        "unsubscribe records an audit event and does not remove report subscriptions",
        async () => {
          await recordConsent(old, false, "account-settings");
          const pref = await preferences(old);
          assert.equal(pref.opted_in, false);
          assert.equal(pref.wording_version, CONSENT_VERSION);
          assert.equal(
            (
              await query(
                "SELECT 1 FROM director.report_subscriptions WHERE owner_id=$1",
                [old],
              )
            ).length,
            2,
          );
          assert.ok(
            (
              await query(
                "SELECT 1 FROM director.marketing_consent_events WHERE owner_id=$1",
                [old],
              )
            ).length,
          );
        },
      );
      await t.test(
        "existing verified email session can establish a password binding without repeating verification",
        async () => {
          const merged = await visitor(
            req(
              "msi_sorp_session=qa-password; " + redeemed.cookie.split(";")[0],
            ),
          );
          assert.equal(merged.id, old);
          assert.equal(merged.emailVerified, true);
        },
      );
    } finally {
      globalThis.fetch = original;
      for (const id of reports)
        await query(
          "DELETE FROM director.reports WHERE id=(SELECT report_id FROM director.reviews WHERE id=$1)",
          [id],
        );
      await query("DELETE FROM director.users WHERE id=ANY($1::text[])", [
        users,
      ]);
      await database().end();
    }
  },
);
