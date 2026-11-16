import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { criteria } from "../src/lib/rubric";
import {
  scoreFramework,
  type Criterion,
  type Page,
} from "../src/lib/assessment";
import {
  REPORT_VERSION,
  reportWeights,
  reportV2Criteria,
  validateReportAnchorReason,
} from "../src/lib/report-methodology";
import {
  visualSample,
  scoreImagePages,
  assessReportPillar,
  inspectVisualBatch,
  type VisualObservation,
} from "../src/lib/report-visual";
import {
  reportRating,
  validateEditorial,
  visualCoverage,
  type EditorialVerdict,
} from "../src/lib/report-verdict";
import { inspectPdfChecks } from "../src/lib/report-accessibility";
const page: Page = {
  page: 1,
  text: "Every household experience informed the next step.",
  extraction: "text",
  readable: true,
};
const observation: VisualObservation = {
  kind: "report-visual-v2",
  page: 1,
  description:
    "Comfortable body type, clear outcome hierarchy and restrained composition.",
  limitations: "No assistive test was performed.",
  readable: true,
};
const finding = (score = 3): Criterion[] =>
  criteria("report").map((c) => ({
    id: c.id,
    status: "assessed",
    score,
    explanation:
      "A concrete strength and material weakness on physical PDF page 1.",
    evidence: [{ page: 1, quote: page.text }],
    visualPages: [1],
    anchorReason:
      "The execution meets this anchor but does not demonstrate exceptional control.",
    barrier: "none",
    limitations: [],
    improvement: "Edit the opening to prioritise the outcomes.",
    confidence: "medium",
    claimIds: [],
  }));
test("anchored reasoning cannot invent a higher execution scale", () => {
  assert.doesNotThrow(() =>
    validateReportAnchorReason(
      "Anchor 4 is exceptional because the difficult comparison is immediately clear.",
    ),
  );
  assert.throws(
    () =>
      validateReportAnchorReason(
        "Anchor 5 is not justified without another feature.",
      ),
    /0–4/,
  );
});
const editorial: EditorialVerdict = {
  verdict:
    "The report makes its purpose and outcomes clear without unnecessary decoration.",
  attention:
    "A concise sequence of outcomes, evidence, limits and next steps holds attention.",
  scoreConsistency: "consistent",
  scoreExplanation:
    "The strong reading experience is consistent with the numerical result.",
  readerTest: Object.fromEntries(
    ["outcomes", "scale", "limitations", "nextSteps"].map((k) => [
      k,
      {
        finding: "The main answer is clearly stated on the opening page.",
        page: 1,
        access: "easy",
      },
    ]),
  ) as EditorialVerdict["readerTest"],
};
async function bytes() {
  const pdf = await PDFDocument.create(),
    font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf
    .addPage([595, 842])
    .drawText(page.text, { x: 40, y: 700, size: 10, font });
  return Buffer.from(await pdf.save());
}
test("v2 weights sum to 100; equal execution normalises honestly; v1 remains equal-weighted", () => {
  assert.equal(reportV2Criteria.length, 25);
  assert.equal(
    reportWeights.reduce((a, b) => a + b, 0),
    100,
  );
  assert.equal(new Set(reportV2Criteria.map((c) => c.id)).size, 25);
  const f = finding(2);
  assert.equal(scoreFramework(f, "report").overall, 50);
  assert.deepEqual(
    scoreFramework(f, "report").principles.map((p) => p.maximum),
    [20, 20, 25, 20, 15],
  );
  f[10].score = 4;
  assert.equal(scoreFramework(f, "report").overall, 52.5);
  assert.equal(scoreFramework(f, "report", undefined, "1.0.0").overall, 52);
  assert.equal(criteria("report", "1.0.0")[15].principle, "Engagement");
  assert.equal(
    criteria("report", REPORT_VERSION)[15].principle,
    "Data communication",
  );
});
test("untested assistive usability is excluded; loss of essential coverage suppresses totals", () => {
  const f = finding();
  f[24] = {
    ...f[24],
    status: "unassessable",
    score: null,
    limitations: ["No assistive test."],
  };
  const s = scoreFramework(f, "report");
  assert.equal(s.coverage, 24);
  assert.equal(s.overall, 75);
  assert.equal(s.principles[4].score, 11.25);
  f[23] = {
    ...f[23],
    status: "unassessable",
    score: null,
    limitations: ["No verified alternatives."],
  };
  assert.equal(scoreFramework(f, "report").overall, null);
});
test("80-plus rating rules are visible and never silently cap the numeric total", () => {
  const f = finding(4);
  f[24] = {
    ...f[24],
    status: "unassessable",
    score: null,
    limitations: ["No assistive test."],
  };
  let s = scoreFramework(f, "report");
  assert.equal(reportRating(s, f, editorial).label, "Excellent");
  f[0].score = 1;
  s = scoreFramework(f, "report");
  const r = reportRating(s, f, editorial);
  assert.equal(s.overall, 97);
  assert.notEqual(r.label, "Excellent");
  assert.match(r.reasons.join(" "), /barrier/);
  f[0].score = 4;
  for (let i = 10; i < 15; i++) f[i].score = 1;
  s = scoreFramework(f, "report");
  assert.equal(s.overall, 81.25);
  assert.notEqual(reportRating(s, f, editorial).label, "Excellent");
  assert.match(
    reportRating(s, f, editorial).reasons.join(" "),
    /Visual design/,
  );
  const slow = structuredClone(editorial);
  slow.readerTest.outcomes.access = "effortful";
  assert.notEqual(
    reportRating(scoreFramework(finding(4), "report"), finding(4), slow).label,
    "Excellent",
  );
});
test("visual coverage includes every page of a 23-page report, preserving old sampling", () => {
  const pages = Array.from({ length: 23 }, (_, i) => ({
    ...page,
    page: i + 1,
    text: i === 16 ? "Risk table" : page.text,
  }));
  assert.equal(visualSample(pages).length, 23);
  assert.ok(visualSample(pages).includes(17));
  assert.ok(visualSample(pages, "1.0.0").length < 23);
  assert.equal(
    visualCoverage(
      pages,
      pages.map((p) => ({ ...observation, page: p.page })),
    ),
    true,
  );
  assert.equal(visualCoverage(pages, [observation]), false);
  const bad = structuredClone(editorial);
  bad.readerTest.outcomes.page = 99;
  assert.throws(() => validateEditorial(bad, pages, [observation]));
});
test("PDF checks report actual small type and missing structure without claiming assistive tests", async () => {
  const c = await inspectPdfChecks(await bytes(), [1]);
  assert.equal(c.pages[0].medianTextPoints, 10);
  assert.equal(c.pages[0].hasStructure, false);
  assert.ok(c.notVerified.some((x) => /Screen-reader/.test(x)));
  assert.ok(c.notVerified.some((x) => /contrast/.test(x)));
});
test("v2 scoring receives actual images, anchored rubric and no unapproved external requests", async () => {
  const original = globalThis.fetch,
    previous = process.env.AI_GATEWAY_API_KEY;
  process.env.AI_GATEWAY_API_KEY = "synthetic-no-network";
  let calls = 0;
  let structureScore = 1;
  try {
    globalThis.fetch = async (input, init) => {
      assert.equal(
        String(input),
        "https://ai-gateway.vercel.sh/v1/chat/completions",
      );
      calls++;
      const body = JSON.parse(String(init?.body)),
        content = body.messages[1].content,
        p = JSON.parse(content[0].text);
      assert.ok(content.some((x: { type: string }) => x.type === "image_url"));
      assert.ok(
        content.some((x: { text?: string }) =>
          x.text?.includes("ENLARGED 1600px"),
        ),
      );
      assert.ok(
        content.some((x: { text?: string }) =>
          x.text?.includes("NORMAL-SIZE full-page rendering at 96dpi"),
        ),
      );
      const variants =
        body.response_format.json_schema.schema.properties.findings.items.anyOf;
      assert.equal(variants[0].properties.visualPages.minItems, 1);
      assert.equal(variants[0].properties.status.const, "assessed");
      assert.equal(variants[2].properties.score.type, "null");
      assert.match(body.messages[0].content, /Merely having a chart/);
      assert.match(
        p.criteria[0].guidance,
        /0 = Absent or seriously obstructive/,
      );
      const findings = finding()
        .filter((f) => p.criteria.some((c: { id: string }) => c.id === f.id))
        .map(({ evidence, ...f }) => ({
          ...f,
          ...(f.id === "report.5.3" ? { score: structureScore } : {}),
          ...(f.id === "report.5.5"
            ? {
                score: null,
                status: "unassessable",
                limitations: ["No actual assistive user test was performed."],
              }
            : {}),
          evidenceIds: [p.passages[0].id],
        }));
      return Response.json({
        choices: [
          {
            finish_reason: "stop",
            message: { content: JSON.stringify({ findings }) },
          },
        ],
        usage: { prompt_tokens: 1, completion_tokens: 1 },
        model: "synthetic",
      });
    };
    const r = await assessReportPillar(
      [page],
      [observation],
      0,
      {},
      null,
      REPORT_VERSION,
      await bytes(),
    );
    assert.equal(r.data.length, 5);
    assert.equal(calls, 1);
    assert.ok(r.data.every((f) => f.anchorReason));
    const pdfBytes = await bytes();
    const checks = await inspectPdfChecks(pdfBytes, [1]);
    const missingStructure = await assessReportPillar(
      [page],
      [observation],
      4,
      {},
      null,
      REPORT_VERSION,
      pdfBytes,
      checks,
    );
    assert.equal(missingStructure.data[2].score, 1);
    structureScore = 2;
    await assert.rejects(
      () =>
        assessReportPillar(
          [page],
          [observation],
          4,
          {},
          null,
          REPORT_VERSION,
          pdfBytes,
          checks,
        ),
      /PDF structural evidence required/,
    );
    assert.equal(calls, 3);
    const noImages = await assessReportPillar(
      [page],
      [],
      2,
      {},
      null,
      REPORT_VERSION,
    );
    assert.ok(
      noImages.data.every(
        (f) => f.score === null && f.status === "unassessable",
      ),
    );
    assert.equal(calls, 3);
    const unavailable = await inspectVisualBatch(
      Buffer.from("broken PDF"),
      [1],
      REPORT_VERSION,
    );
    assert.equal(unavailable.data[0].readable, false);
    assert.equal(calls, 3);
  } finally {
    globalThis.fetch = original;
    if (previous === undefined) delete process.env.AI_GATEWAY_API_KEY;
    else process.env.AI_GATEWAY_API_KEY = previous;
  }
});

test("direct data scoring includes a critical table and dense chart pages, not just early background statistics", () => {
  const pages = Array.from({ length: 23 }, (_, i) => ({
    ...page,
    page: i + 1,
    text:
      i === 4
        ? "A raster chart; labels are pixels, not extracted text."
        : i === 5
          ? "Another raster chart without text-extractable labels."
          : i === 16
            ? "Risk table: high impact risk next 2 years"
            : i === 2
              ? "Background statistics: 50% 20% 10% 10% 10%."
              : "Context and background.",
  }));
  const observations = pages.map((p) => ({
    ...observation,
    page: p.page,
    contentKinds: [5, 6].includes(p.page) ? ["chart" as const] : [],
  }));
  const checks = {
    pages: [{ page: 17, roles: ["Table"] }],
  } as unknown as import("../src/lib/report-accessibility").PdfChecks;
  assert.deepEqual(
    new Set(scoreImagePages(pages, observations, 3, checks)),
    new Set([17, 5, 6, 1, 12, 23]),
  );
});

test("v2 accepts a verified assessed obstruction at zero and renders real normal-size comparisons", async () => {
  const b = await bytes();
  const normal = await import("../src/lib/report-visual").then((m) =>
    m.renderVisualPages(b, [1], 0),
  );
  assert.equal(
    Buffer.from(normal[0].dataUrl.split(",")[1], "base64").readUInt32BE(16),
    793,
  );
  const f = finding();
  f[0] = { ...f[0], score: 0, barrier: "serious" };
  const { validateFindings } = await import("../src/lib/assessment");
  assert.equal(
    validateFindings(f, "report", [page], [], undefined, REPORT_VERSION)[0]
      .score,
    0,
  );
  assert.throws(() =>
    validateFindings(f, "report", [page], [], undefined, "1.0.0"),
  );
});
