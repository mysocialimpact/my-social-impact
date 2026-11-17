import { test } from "node:test";
import assert from "node:assert/strict";
import { criteria } from "../src/lib/rubric";
import { scoreFramework, type Criterion } from "../src/lib/assessment";
import {
  reportWeights,
  REPORT_VERSION,
  reportWeightsFor,
  reportCriteriaFor,
} from "../src/lib/report-methodology";
import { visualSample } from "../src/lib/report-visual";
import { learningSlides } from "../src/lib/review-learning";
const findings = (scores: number[]): Criterion[] =>
  criteria("report").map((c, i) => ({
    id: c.id,
    status: "assessed",
    score: scores[Math.floor(i / 5)],
    explanation: "Observed execution on the physical source page.",
    evidence: [{ page: 1, quote: "The specific source passage." }],
    visualPages: [1],
    anchorReason: "The observed execution meets this supplied anchor.",
    barrier: "none",
    limitations: [],
    improvement: "Make the main findings more apparent.",
    confidence: "medium",
    claimIds: [],
  }));
test("revised weights follow execution and hierarchy has the greatest contribution", () => {
  assert.deepEqual(reportWeights, [25, 30, 25, 10, 10]);
  assert.equal(scoreFramework(findings([4, 0, 0, 0, 0]), "report").overall, 25);
  assert.equal(scoreFramework(findings([0, 4, 0, 0, 0]), "report").overall, 30);
  assert.equal(scoreFramework(findings([2, 2, 2, 2, 2]), "report").overall, 50);
  assert.equal(scoreFramework(findings([3, 3, 3, 3, 3]), "report").overall, 75);
  assert.deepEqual(reportWeightsFor("2.0.0-report"), [20, 20, 25, 20, 15]);
  assert.equal(reportCriteriaFor("2.0.0")[20].principle, "Accessibility");
  assert.equal(
    reportCriteriaFor(REPORT_VERSION)[5].principle,
    "Information Hierarchy",
  );
});
test("insufficient coverage is disclosed without invented scores", () => {
  const f = findings([4, 4, 4, 4, 4]);
  for (const i of [0, 1])
    Object.assign(f[i], {
      status: "unassessable",
      score: null,
      limitations: ["Unavailable reliable evidence."],
    });
  assert.equal(scoreFramework(f, "report").overall, null);
  assert.equal(scoreFramework(f, "report").coverage, 23);
});
test("all 30 physical pages are inspected and historical sampling is preserved", () => {
  const p = Array.from({ length: 30 }, (_, i) => ({
    page: i + 1,
    text: "A report page.",
    readable: true,
    extraction: "text" as const,
  }));
  assert.equal(visualSample(p).length, 30);
  assert.ok(visualSample(p, "2.0.0").length < 30);
});
test("all three learning journeys explain what and why with concise copy", () => {
  for (const f of ["claims", "excellence", "report"] as const) {
    const s = learningSlides(f, REPORT_VERSION);
    assert.equal(s.length, 7);
    for (const p of s.slice(1, 6)) {
      assert.ok(p.why);
      const words = (p.explanation + " " + p.why).split(/\s+/).length;
      assert.ok(words >= 25 && words <= 55, `${f} ${p.label}: ${words}`);
    }
    assert.ok(s[6].href);
  }
  assert.equal(
    learningSlides("report", "2.0.0")[1].label,
    "Readability and hierarchy",
  );
  assert.equal(learningSlides("report", "1.0.0")[1].label, "Clarity");
});

test("actual PDF transparency groups render with a transformed clipping path in Node", async () => {
  const { PDFDocument, StandardFonts } = await import("pdf-lib");
  const { renderVisualPages } = await import("../src/lib/report-visual");
  const source = await PDFDocument.create(),
    font = await source.embedFont(StandardFonts.Helvetica),
    page = source.addPage([300, 400]);
  page.drawText("A transformed transparency-group regression fixture.", {
    x: 20,
    y: 300,
    size: 12,
    font,
  });
  const target = await PDFDocument.create(),
    embedded = await target.embedPage(page),
    out = target.addPage([595, 842]);
  out.drawPage(embedded, { x: 40, y: 100, width: 450, height: 600 });
  const images = await renderVisualPages(
    Buffer.from(await target.save()),
    [1],
    900,
  );
  assert.equal(images[0].page, 1);
  assert.ok(images[0].dataUrl.startsWith("data:image/png;base64,"));
  assert.ok(
    Buffer.from(images[0].dataUrl.split(",")[1], "base64").length > 1000,
  );
});
