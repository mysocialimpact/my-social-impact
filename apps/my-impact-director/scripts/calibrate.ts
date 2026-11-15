import { PDFDocument, StandardFonts } from "pdf-lib";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { calibrationFixtures } from "../tests/calibration-fixtures";
import { aiAvailable } from "../src/lib/ai";
import { database, query } from "../src/lib/db";
import { createReview, getReview } from "../src/lib/reviews";
import { processOne } from "../src/lib/pipeline";

const run = process.argv.includes("--run");
const enqueue = process.argv.includes("--enqueue");
const folder = "artifacts/calibration";
await mkdir(folder, { recursive: true });
if (
  (run || enqueue) &&
  (new URL(process.env.DATABASE_URL || "https://missing").pathname !==
    "/my_impact_director_validation" ||
    (run && !aiAvailable()))
)
  throw new Error(
    "Live calibration requires the isolated validation database and authorised AI credentials.",
  );
const records: unknown[] = [];
try {
  for (const fixture of calibrationFixtures) {
    const pdf = await PDFDocument.create(),
      font = await pdf.embedFont(StandardFonts.Helvetica);
    pdf.setTitle(fixture.title);
    const page = pdf.addPage([595, 842]);
    page.drawText("SYNTHETIC CALIBRATION FIXTURE", {
      font,
      size: 10,
      x: 50,
      y: 790,
    });
    page.drawText(fixture.title, { font, size: 15, x: 50, y: 755 });
    page.drawText(fixture.text, {
      font,
      size: 11,
      x: 50,
      y: 710,
      maxWidth: 495,
      lineHeight: 17,
    });
    const bytes = Buffer.from(await pdf.save());
    await writeFile(`${folder}/${fixture.id}.pdf`, bytes);
    const record: Record<string, unknown> = {
      id: fixture.id,
      title: fixture.title,
      humanReviewCheck: fixture.check,
      status: "prepared, not assessed",
    };
    if (run || enqueue) {
      const owner = `calibration-${randomUUID()}`;
      try {
        await query(
          "INSERT INTO director.users(id,email,name) VALUES($1,$2,$3)",
          [owner, "calibration@example.invalid", "Synthetic calibration"],
        );
        const user = {
          id: owner,
          email: "calibration@example.invalid",
          name: "Synthetic calibration",
          founder: false,
        };
        const review = await createReview(
          user,
          bytes,
          `${fixture.id}.pdf`,
          true,
          false,
        );
        record.ownerId = owner;
        record.reviewId = review.id;
        if (run) {
          for (let i = 0; i < 25; i++) {
            if (!(await processOne(review.id))) break;
          }
        }
        const saved = await getReview(user, review.id);
        record.status = saved.status;
        record.errorCode = saved.error_code;
        record.result = saved.result;
        record.estimatedCost = saved.cost_usd;
        await writeFile(
          `${folder}/${fixture.id}.json`,
          JSON.stringify(record, null, 2),
        );
      } finally {
        if (!enqueue) {
          await query("DELETE FROM director.reports WHERE owner_id=$1", [
            owner,
          ]);
          await query("DELETE FROM director.users WHERE id=$1", [owner]);
        }
      }
    }
    records.push(record);
    console.log(`${fixture.id}: ${record.status}`);
  }
} finally {
  await writeFile(
    `${folder}/manifest.json`,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        mode: enqueue
          ? "queued for real hosted processing — not yet assessed"
          : run
            ? "live model — human calibration still required"
            : "prepared only — no model evaluation",
        fixtures: records,
      },
      null,
      2,
    ),
  );
  if (run || enqueue) await database().end();
}
if (run && records.some((r) => (r as { status: string }).status !== "complete"))
  process.exitCode = 1;
