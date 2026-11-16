import { visitor } from "../src/lib/auth";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { readFile } from "node:fs/promises";
import { createGuest, localIdentity, tokenHash } from "../src/lib/access";
import { createReview, startFramework } from "../src/lib/reviews";
import { requestEmailSave, redeemEmailLink } from "../src/lib/email-save";
import { workspaces } from "../src/lib/workspace";
import { query, database } from "../src/lib/db";
test(
  "verified workspace adopts guest documents, reuses an existing account and avoids historical redelivery",
  { skip: process.env.RUN_DATABASE_TESTS !== "1", timeout: 60000 },
  async () => {
    assert.equal(
      new URL(process.env.DATABASE_URL!).pathname,
      "/my_impact_director_validation",
    );
    process.env.REVIEWS_ENABLED = "true";
    process.env.EMAIL_ENABLED = "true";
    process.env.RESEND_API_KEY = "synthetic-contract-only";
    process.env.EMAIL_FROM = "QA <qa@example.invalid>";
    const prefix = "workspace-" + randomUUID(),
      email = prefix + "@example.invalid",
      existingId = "qa-" + prefix,
      users = [existingId],
      reports: string[] = [],
      emails: any[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      if (String(input) === "https://api.resend.com/emails") {
        emails.push(JSON.parse(String(init?.body)));
        return Response.json({ id: "synthetic-receipt" });
      }
      if (String(input).includes("/api/readiness-account"))
        return Response.json({
          signedIn: true,
          account: { id: existingId, email, name: "Existing account" },
          platformAccess: { founder: false },
        });
      return originalFetch(input, init);
    };
    async function pdf(label: string) {
      const p = await PDFDocument.create();
      p.addPage().drawText(label);
      return Buffer.from(await p.save());
    }
    try {
      await query(
        "INSERT INTO director.users(id,email,name) VALUES($1,$2,'Existing account')",
        [existingId, email],
      );
      const existing = {
        id: existingId,
        email,
        name: "Existing account",
        founder: false,
      };
      const old = await createReview(
        existing,
        await pdf("Previous authorised report"),
        "old.pdf",
        true,
        false,
        null,
        true,
      );
      reports.push(old.id);
      const oldChild = await startFramework(existing, old.id, "claims");
      const fixture = JSON.parse(
        await readFile("artifacts/claims-review.json", "utf8"),
      );
      await query(
        "UPDATE director.reviews SET status='complete',result=$2 WHERE id=$1",
        [oldChild.id, JSON.stringify(fixture.result)],
      );
      const guest = await createGuest(
        new Request("https://test.example/api/visitor", {
          headers: { "x-forwarded-for": prefix },
        }),
      );
      users.push(guest.user.id);
      const a = await createReview(
          guest.user,
          await pdf("First guest document"),
          "first.pdf",
          true,
          false,
          null,
          true,
        ),
        b = await createReview(
          guest.user,
          await pdf("Second guest document"),
          "second.pdf",
          true,
          false,
          null,
          true,
        );
      reports.push(a.id, b.id);
      await startFramework(guest.user, a.id, "claims");
      const [unverifiedWorkspace] = await workspaces(guest.user, a.id);
      assert.equal(
        (unverifiedWorkspace.assessments as any[])[0].has_result,
        false,
      );

      const req = new Request("https://test.example/api/save", {
        headers: {
          cookie: guest.cookie!.split(";")[0],
          "x-forwarded-for": prefix,
        },
      });
      await requestEmailSave(req, { email, account: true, reviewId: a.id });
      assert.equal(emails.length, 1);
      const token = emails[0].text.match(/access#([A-Za-z0-9_-]{43})/)[1],
        redeemed = await redeemEmailLink(token);
      const verified = await localIdentity(
        new Request("https://test.example", {
          headers: { cookie: redeemed.cookie.split(";")[0] },
        }),
      );
      assert.ok(
        (
          await query<{ email_verified_at: string }>(
            "SELECT email_verified_at FROM director.users WHERE id=$1",
            [existingId],
          )
        )[0].email_verified_at,
      );
      assert.equal(verified!.id, existingId);
      assert.equal(verified!.emailVerified, true);
      const combined = await visitor(
        new Request("https://test.example/api/account", {
          headers: {
            cookie:
              "msi_sorp_session=existing; " + redeemed.cookie.split(";")[0],
          },
        }),
      );
      assert.equal(
        combined.emailVerified,
        true,
        "a matching legacy session retains the verified-email proof",
      );

      assert.equal(
        (
          await query(
            "SELECT id FROM director.users WHERE lower(email)=$1 AND NOT is_anonymous",
            [email],
          )
        ).length,
        1,
      );
      const rows = await workspaces(verified!);
      assert.equal(rows.length, 3);
      assert.ok(rows.every((w) => w.full));
      assert.equal(
        (
          await query(
            "SELECT 1 FROM director.report_subscriptions WHERE owner_id=$1",
            [existingId],
          )
        ).length,
        2,
      );
      assert.equal(
        (
          await query(
            "SELECT 1 FROM director.report_deliveries WHERE review_id=$1",
            [oldChild.id],
          )
        ).length,
        0,
        "opening history must not request delivery of old reports",
      );
      await startFramework(verified!, old.id, "report");
      assert.equal(
        (
          await query(
            "SELECT 1 FROM director.report_subscriptions WHERE report_id=(SELECT report_id FROM director.reviews WHERE id=$1) AND owner_id=$2",
            [old.id, existingId],
          )
        ).length,
        1,
        "an explicitly selected new review subscribes the verified account",
      );
      await assert.rejects(
        () => workspaces({ ...existing, id: "foreign" }, a.id),
        { status: 404 },
      );
      const expired = "x".repeat(43);
      await query(
        "INSERT INTO director.email_links(token_hash,owner_id,email,expires_at) VALUES($1,$2,$3,now()-interval '1 second')",
        [tokenHash(expired), existingId, email],
      );
      await assert.rejects(() => redeemEmailLink(expired), { status: 410 });
    } finally {
      globalThis.fetch = originalFetch;
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
