import { REPORT_VERSION } from "../src/lib/report-methodology";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createGuest } from "../src/lib/access";
import { createReview, startFramework, getReview } from "../src/lib/reviews";
import { workspaces } from "../src/lib/workspace";
import { query, database } from "../src/lib/db";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { randomUUID } from "node:crypto";
test(
  "new Impact Edit version coexists with immutable old result and workspace chooses newest",
  { skip: process.env.RUN_DATABASE_TESTS !== "1" },
  async () => {
    assert.equal(
      new URL(process.env.DATABASE_URL!).pathname,
      "/my_impact_director_validation",
    );
    process.env.REVIEWS_ENABLED = "true";
    const guest = await createGuest(
      new Request("https://test.example", {
        headers: { "x-forwarded-for": "version-" + randomUUID() },
      }),
    );
    let reportId: string | undefined;
    try {
      const pdf = await PDFDocument.create(),
        font = await pdf.embedFont(StandardFonts.Helvetica);
      pdf
        .addPage()
        .drawText("Synthetic report version compatibility fixture.", {
          font,
          size: 12,
          x: 40,
          y: 700,
        });
      const parent = await createReview(
        guest.user,
        Buffer.from(await pdf.save()),
        "versions.pdf",
        true,
        false,
        null,
        true,
      );
      reportId = String((await getReview(guest.user, parent.id)).report_id);
      const original = {
        version: "1.0.0",
        framework: "report",
        scores: { report: { overall: 84 } },
        fixture:
          "Historical envelope; this test checks storage immutability, not scoring.",
      };
      const [old] = await query<{ id: string }>(
        "INSERT INTO director.reviews(report_id,version,framework,status,stage,result) VALUES($1,'1.0.0-report','report','complete',15,$2) RETURNING id",
        [reportId, JSON.stringify(original)],
      );
      const current = await startFramework(guest.user, parent.id, "report");
      assert.notEqual(current.id, old.id);
      assert.equal(
        (await getReview(guest.user, current.id)).version,
        REPORT_VERSION + "-report",
      );
      assert.deepEqual((await getReview(guest.user, old.id)).result, original);
      assert.equal(
        (await startFramework(guest.user, parent.id, "report")).id,
        current.id,
      );
      const [workspace] = await workspaces(guest.user, parent.id),
        assessments = workspace.assessments as {
          id: string;
          framework: string;
          version: string;
        }[];
      assert.equal(
        assessments.find((a) => a.framework === "report")!.id,
        current.id,
      );
      assert.equal(
        assessments.find((a) => a.id === old.id)!.version,
        "1.0.0-report",
      );
    } finally {
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
