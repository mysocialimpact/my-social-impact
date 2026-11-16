import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { database, query, transaction } from "../src/lib/db";
import { createGuest, privateNetworkKey } from "../src/lib/access";
import { protectUpload } from "../src/lib/upload-protection";
import { createReview, deleteReview } from "../src/lib/reviews";
import { recordCompletedReport } from "../src/lib/review-allowance";
import { rateLimit, failure, AppError } from "../src/lib/security";
import { POST as begin } from "../src/app/api/uploads/route";
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
test(
  "shared-network visitors, abandoned/failed uploads, successful allowance and abuse protection",
  { skip: process.env.RUN_DATABASE_TESTS !== "1", timeout: 180000 },
  async () => {
    assert.equal(
      new URL(process.env.DATABASE_URL!).pathname,
      "/my_impact_director_validation",
    );
    process.env.APP_ORIGIN = "https://test.example";
    process.env.REVIEWS_ENABLED = "true";
    const ip = randomUUID();
    const req = new Request("https://test.example/api/visitor", {
      headers: { "x-forwarded-for": ip },
    });
    const network = privateNetworkKey(req);
    const keys = [
      "visitor:" + network,
      "anonymous-upload:" + network,
      "visitor-v2:" + network,
      "upload-network-v2:" + network,
    ];
    const users: string[] = [];
    async function seed(key: string, count = 999) {
      if (!keys.includes(key)) keys.push(key);
      await query(
        "INSERT INTO director.rate_limits(key,count,reset_at) VALUES($1,$2,now()+interval '24 hours') ON CONFLICT(key) DO UPDATE SET count=$2,reset_at=now()+interval '24 hours'",
        [hash(key), count],
      );
    }
    async function pdf() {
      const d = await PDFDocument.create();
      d.addPage();
      d.setTitle(randomUUID());
      return Buffer.from(await d.save());
    }
    try {
      // The exact legacy network lockout must no longer affect either browser.
      await seed("visitor:" + network);
      await seed("anonymous-upload:" + network);
      const a = await createGuest(req),
        b = await createGuest(req);
      users.push(a.user.id, b.user.id);
      assert.notEqual(a.user.id, b.user.id);
      await seed("new-report:" + a.user.id);
      await seed("upload:" + a.user.id);
      keys.push(
        "upload-attempt-v2:" + a.user.id,
        "upload-attempt-v2:" + b.user.id,
      );
      for (let i = 0; i < 5; i++) {
        const response = await begin(
          new Request("https://test.example/api/uploads", {
            method: "POST",
            headers: {
              origin: "https://test.example",
              "x-forwarded-for": ip,
              cookie: a.cookie!.split(";")[0],
              "content-type": "application/json",
            },
            body: JSON.stringify({
              name: "abandoned.pdf",
              size: 100,
              consent: true,
            }),
          }),
        );
        assert.equal(response.status, 201, await response.text());
      }
      await protectUpload(req, b.user); // Fresh session on the same IP still works.
      assert.equal(
        (
          await query(
            "SELECT 1 FROM director.completed_reports WHERE owner_id=$1",
            [a.user.id],
          )
        ).length,
        0,
      );
      await assert.rejects(
        () =>
          createReview(
            a.user,
            Buffer.from("invalid pdf"),
            "bad.pdf",
            true,
            false,
          ),
        { status: 400 },
      );
      // Four different failed reports must not exhaust the three-success allowance.
      const failed: string[] = [];
      for (let i = 0; i < 4; i++) {
        const r = await createReview(
          a.user,
          await pdf(),
          "failed.pdf",
          true,
          false,
          null,
          true,
        );
        failed.push(r.id);
        await query("UPDATE director.reviews SET status='failed' WHERE id=$1", [
          r.id,
        ]);
      }
      const bytes = await pdf();
      const duplicate = await Promise.all([
        createReview(a.user, bytes, "same.pdf", true, false, null, true),
        createReview(a.user, bytes, "same.pdf", true, false, null, true),
      ]);
      assert.equal(duplicate[0].id, duplicate[1].id);
      for (let i = 0; i < 2; i++)
        await createReview(
          a.user,
          await pdf(),
          "active.pdf",
          true,
          false,
          null,
          true,
        );
      await assert.rejects(
        () =>
          pdf().then((bytes) =>
            createReview(
              a.user,
              bytes,
              "fourth-active.pdf",
              true,
              false,
              null,
              true,
            ),
          ),
        { code: "REVIEWS_IN_PROGRESS" },
      );
      assert.equal(
        (
          await query(
            "SELECT 1 FROM director.completed_reports WHERE owner_id=$1",
            [a.user.id],
          )
        ).length,
        0,
      );
      await query(
        "UPDATE director.reviews SET status='failed' WHERE report_id IN(SELECT id FROM director.reports WHERE owner_id=$1)",
        [a.user.id],
      );
      const rows = await query<{ report_id: string }>(
        "SELECT report_id FROM director.reviews WHERE id=ANY($1::uuid[])",
        [failed.slice(0, 3)],
      );
      // Multiple frameworks/retries record only one successful report charge.
      await transaction(async (c) => {
        for (const r of rows) {
          await recordCompletedReport(c, r.report_id);
          await recordCompletedReport(c, r.report_id);
        }
      });
      assert.equal(
        (
          await query(
            "SELECT 1 FROM director.completed_reports WHERE owner_id=$1",
            [a.user.id],
          )
        ).length,
        3,
      );
      await deleteReview(a.user, failed[0]);
      await assert.rejects(
        () =>
          pdf().then((bytes) =>
            createReview(
              a.user,
              bytes,
              "over-quota.pdf",
              true,
              false,
              null,
              true,
            ),
          ),
        { code: "REVIEW_ALLOWANCE" },
      );
      // A genuine new visitor has their own allowance despite sharing the IP.
      await createReview(
        b.user,
        await pdf(),
        "first-free-review.pdf",
        true,
        false,
        null,
        true,
      );
      const bounded = "qa-limit:" + randomUUID();
      keys.push(bounded);
      await rateLimit(bounded, 1, 60);
      let rejection: unknown;
      try {
        await rateLimit(bounded, 1, 60);
      } catch (e) {
        rejection = e;
      }
      assert.ok(rejection instanceof AppError);
      assert.equal(failure(rejection).status, 429);
      assert.ok(Number(failure(rejection).headers.get("retry-after")) > 0);
      await assert.rejects(() => rateLimit(bounded, 1, 60), {
        code: "RATE_LIMIT",
      });
      assert.equal(
        (
          await query<{ count: number }>(
            "SELECT count FROM director.rate_limits WHERE key=$1",
            [hash(bounded)],
          )
        )[0].count,
        1,
        "rejected requests do not consume/extend the bucket",
      );
    } finally {
      await query(
        "DELETE FROM director.uploads WHERE owner_id=ANY($1::text[])",
        [users],
      );
      await query(
        "DELETE FROM director.reports WHERE owner_id=ANY($1::text[])",
        [users],
      );
      await query("DELETE FROM director.users WHERE id=ANY($1::text[])", [
        users,
      ]);
      await query(
        "DELETE FROM director.rate_limits WHERE key=ANY($1::text[])",
        [keys.map(hash)],
      );
      await database().end();
    }
  },
);
