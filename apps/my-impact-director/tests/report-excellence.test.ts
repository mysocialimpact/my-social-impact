import { test } from "node:test";
import assert from "node:assert/strict";
import { criteria } from "../src/lib/rubric";
import {
  scoreFramework as aggregate,
  validateFindings,
  type Criterion,
} from "../src/lib/assessment";
import { visualSample, renderVisualPages } from "../src/lib/report-visual";
import { PDFDocument, StandardFonts } from "pdf-lib";
// v1 equal-weighting regression remains locked to its historical version.
const scoreFramework = (
  f: Criterion[],
  framework: Parameters<typeof aggregate>[1],
  thresholds?: Parameters<typeof aggregate>[2],
  version = "1.0.0",
) => aggregate(f, framework, thresholds, version);
const findings = (): Criterion[] =>
  criteria("report").map((c) => ({
    id: c.id,
    status: "assessed",
    score: 4,
    explanation: "Specific observation",
    evidence: [{ page: 1, quote: "This is a clear report." }],
    limitations: [],
    improvement: "Improve the headline.",
    confidence: "medium",
    claimIds: [],
  }));
test("25 tests sum to 100, pillar exclusions normalise with strict 22/4 coverage", () => {
  const f = findings();
  assert.equal(scoreFramework(f, "report").overall, 100);
  f[0] = {
    ...f[0],
    status: "not_applicable",
    score: null,
    limitations: ["Inapplicable in context"],
  };
  assert.equal(scoreFramework(f, "report").overall, 100);
  for (const n of [5, 10])
    f[n] = {
      ...f[n],
      status: "unassessable",
      score: null,
      limitations: ["Source limitation"],
    };
  assert.equal(scoreFramework(f, "report").coverage, 22);
  assert.equal(scoreFramework(f, "report").overall, 100);
  f[15] = { ...f[15], status: "unassessable", score: null };
  assert.equal(scoreFramework(f, "report").overall, null);
  assert.throws(() => scoreFramework(f.slice(1), "report"));
});
test("five criteria per pillar, zero is retained and missing evidence is rejected", () => {
  const f = findings();
  f[0] = { ...f[0], status: "not_demonstrated", score: 0 };
  assert.equal(scoreFramework(f, "report").overall, 96);
  const p = [
    {
      page: 1,
      text: "This is a clear report.",
      readable: true,
      extraction: "text" as const,
    },
  ];
  assert.equal(validateFindings(f.slice(0, 5), "report", p, [], 0).length, 5);
  f[1].evidence = [];
  assert.throws(() => validateFindings(f, "report", p, []));
});
test("systematic sample includes endpoints and targeted pages without duplicates", () => {
  const p = Array.from({ length: 100 }, (_, i) => ({
    page: i + 1,
    text: i === 45 ? "Case study" : "Text",
    readable: true,
    extraction: "text" as const,
  }));
  const n = visualSample(p);
  assert.ok(n.includes(1) && n.includes(100) && n.includes(46));
  assert.equal(n.length, new Set(n).size);
  assert.ok(n.length <= 13);
  assert.deepEqual(visualSample(p.slice(0, 5)), [1, 2, 3, 4, 5]);
});
test("actual page rendering preserves page numbers and produces nonempty PNGs", async () => {
  const pdf = await PDFDocument.create(),
    font = await pdf.embedFont(StandardFonts.Helvetica);
  for (let n = 1; n <= 2; n++)
    pdf
      .addPage([400, 500])
      .drawText("Physical page " + n, { font, size: 32, x: 30, y: 400 });
  const images = await renderVisualPages(Buffer.from(await pdf.save()), [2, 1]);
  assert.deepEqual(
    images.map((i) => i.page),
    [2, 1],
  );
  assert.ok(
    images.every(
      (i) =>
        i.dataUrl.startsWith("data:image/png;base64,") &&
        i.dataUrl.length > 5000,
    ),
  );
  await assert.rejects(() =>
    renderVisualPages(Buffer.from(new Uint8Array([1, 2])), [1]),
  );
});
