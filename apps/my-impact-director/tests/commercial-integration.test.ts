import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { POST } from "../src/app/api/service-intents/route";
import { createGuest } from "../src/lib/access";
import { createReview, startFramework } from "../src/lib/reviews";
import { query, database } from "../src/lib/db";
test(
  "contact intent is not an enquiry; only opted-in owned completed reviews can be linked",
  { skip: process.env.RUN_DATABASE_TESTS !== "1", timeout: 60000 },
  async () => {
    assert.equal(
      new URL(process.env.DATABASE_URL!).pathname,
      "/my_impact_director_validation",
    );
    process.env.APP_ORIGIN = "https://test.example";
    process.env.REVIEWS_ENABLED = "true";
    const network = "commercial-" + randomUUID();
    const guest = await createGuest(
      new Request("https://test.example", {
        headers: { "x-forwarded-for": network },
      }),
    );
    const cookie = guest.cookie!.split(";")[0];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw Error("No external model, email or identity calls permitted");
    };
    let reportId: string | undefined;
    const req = (
      body: unknown,
      auth = cookie,
      origin = "https://test.example",
    ) =>
      new Request("https://test.example/api/service-intents", {
        method: "POST",
        headers: {
          origin,
          "content-type": "application/json",
          "x-forwarded-for": network,
          cookie: auth,
        },
        body: JSON.stringify(body),
      });
    const data = {
      kind: "contact",
      service: "improvement",
      source: "review",
      reviewId: null,
    };
    try {
      assert.equal(
        (await POST(req(data, cookie, "https://foreign.example"))).status,
        403,
      );
      assert.equal(
        (await POST(req({ ...data, service: "essentials" }))).status,
        400,
      );
      assert.equal(
        (await POST(req({ ...data, reportContent: "private" }))).status,
        400,
      );
      const anonymous = await POST(req(data, ""));
      assert.equal(anonymous.status, 200);
      assert.deepEqual(await anonymous.json(), {
        recorded: "intent_only",
        emailSent: false,
      });
      assert.equal(
        (
          await query("SELECT id FROM director.audit WHERE actor_id=$1", [
            guest.user.id,
          ])
        ).length,
        0,
      );
      const pdf = await PDFDocument.create();
      pdf
        .addPage()
        .drawText("Synthetic private report. No assessment is called.");
      const parent = await createReview(
        guest.user,
        Buffer.from(await pdf.save()),
        "commercial-qa.pdf",
        true,
        false,
        null,
        true,
      );
      reportId = (
        await query<{ report_id: string }>(
          "SELECT report_id FROM director.reviews WHERE id=$1",
          [parent.id],
        )
      )[0].report_id;
      const child = await startFramework(guest.user, parent.id, "claims");
      assert.equal(
        (await POST(req({ ...data, reviewId: child.id }))).status,
        403,
      );
      await query(
        "UPDATE director.users SET is_anonymous=false,email=$2,email_verified_at=now() WHERE id=$1",
        [guest.user.id, network + "@example.invalid"],
      );
      await query(
        "UPDATE director.access_sessions SET kind='email' WHERE owner_id=$1",
        [guest.user.id],
      );
      const verified = cookie.replace("mid_access=", "mid_saved=");
      assert.equal(
        (await POST(req({ ...data, reviewId: child.id }, verified))).status,
        403,
      );
      await query(
        "UPDATE director.reviews SET status='complete',result=$2 WHERE id=$1",
        [
          child.id,
          JSON.stringify({ framework: "claims", version: "1.0.0", scores: {} }),
        ],
      );
      await query(
        "INSERT INTO director.review_grants(review_id,owner_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
        [child.id, guest.user.id],
      );
      assert.equal(
        (await POST(req({ ...data, reviewId: randomUUID() }, verified))).status,
        404,
      );
      assert.equal((await POST(req(data, verified))).status, 200);
      assert.equal(
        (await POST(req({ ...data, reviewId: child.id }, verified))).status,
        200,
      );
      const rows = await query<{ resource_id: string | null }>(
        "SELECT resource_id FROM director.audit WHERE actor_id=$1 AND action='service-intent:improvement' ORDER BY id",
        [guest.user.id],
      );
      assert.deepEqual(
        rows.map((r) => r.resource_id),
        [null, child.id],
      );
      assert.equal(
        (
          await query("SELECT id FROM director.enquiries WHERE owner_id=$1", [
            guest.user.id,
          ])
        ).length,
        0,
      );
      assert.equal(
        (await POST(req({ kind: "visit", returning: true }, ""))).status,
        200,
      );
    } finally {
      globalThis.fetch = originalFetch;
      await query("DELETE FROM director.audit WHERE actor_id=$1", [
        guest.user.id,
      ]);
      if (reportId)
        await query("DELETE FROM director.reports WHERE id=$1", [reportId]);
      await query("DELETE FROM director.access_sessions WHERE owner_id=$1", [
        guest.user.id,
      ]);
      await query("DELETE FROM director.users WHERE id=$1", [guest.user.id]);
      await database().end();
    }
  },
);
