import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, StandardFonts } from "pdf-lib";
import {
  artConfiguration,
  validateArtReview,
  artContradictions,
  enforceArtCoverage,
  inspectArtDirector,
  type ArtRecord,
} from "../src/lib/art-director";
import { visualSample } from "../src/lib/report-visual";
import { AIError } from "../src/lib/ai";
import { criteria } from "../src/lib/rubric";
import {
  scoreFramework,
  type Criterion,
  type Page,
} from "../src/lib/assessment";
import { firstOpinion, testFindings } from "./fixtures/art-director";
test("art director requires complete physical-page coverage and rejects invented references", () => {
  const valid = firstOpinion();
  assert.equal(validateArtReview(valid, [1, 2]).observations.length, 2);
  assert.throws(
    () =>
      validateArtReview(
        {
          ...valid,
          observations: [valid.observations[0], valid.observations[0]],
        },
        [1, 2],
      ),
    /exactly once/,
  );
  assert.throws(
    () =>
      validateArtReview(
        {
          ...valid,
          strengths: [
            {
              finding: "Invented page cannot support an editorial claim.",
              pages: [99],
            },
          ],
        },
        [1, 2],
      ),
    /uninspected/,
  );
  for (const count of [20, 23, 30]) {
    const pages = Array.from({ length: count }, (_, i) => ({
      page: i + 1,
      text: "Report page.",
      extraction: "text" as const,
      readable: true,
    }));
    assert.deepEqual(
      visualSample(pages, "2.1.0"),
      pages.map((p) => p.page),
    );
  }
});
test("qualitative contradictions trigger investigation, never a mechanical score penalty", () => {
  const record = {
      review: firstOpinion(),
      requiredPages: [1, 2],
    } as unknown as ArtRecord,
    findings = testFindings(),
    before = scoreFramework(findings, "report", undefined, "2.1.0");
  const flags = artContradictions(record, before);
  assert.equal(flags.length, 1);
  assert.match(flags[0], /design/);
  assert.equal(before.principles[2].score, 18.75);
  record.review.observations[1].readable = false;
  const incomplete = enforceArtCoverage(findings, record);
  assert.ok(
    incomplete
      .slice(10, 15)
      .every((f) => f.score === null && f.status === "unassessable"),
  );
  assert.deepEqual(incomplete.slice(0, 10), findings.slice(0, 10));
});
test("invalid visual responses retain charged usage for retry cost accounting", async () => {
  const original = globalThis.fetch,
    oldKey = process.env.AI_GATEWAY_API_KEY;
  process.env.AI_GATEWAY_API_KEY = "synthetic-only";
  try {
    const pdf = await PDFDocument.create(),
      font = await pdf.embedFont(StandardFonts.Helvetica);
    pdf
      .addPage()
      .drawText("Synthetic community housing advice report.", { font });
    const awaitedBytes = await pdf.save();
    globalThis.fetch = async () =>
      Response.json({
        model: "openai/gpt-6.1-terra",
        id: "synthetic",
        choices: [
          {
            finish_reason: "stop",
            message: { content: JSON.stringify(firstOpinion([99])) },
          },
        ],
        usage: { prompt_tokens: 100, completion_tokens: 100 },
      });
    await assert.rejects(
      () =>
        inspectArtDirector(Buffer.from(awaitedBytes), [
          {
            page: 1,
            text: "Synthetic community housing advice report.",
            extraction: "text",
            readable: true,
          },
        ]),
      (e: unknown) =>
        e instanceof AIError &&
        e.code === "ART_EVIDENCE_INVALID" &&
        !!e.usage &&
        Math.abs(e.usage.cost - 0.0006) < 1e-10,
    );
  } finally {
    globalThis.fetch = original;
    if (oldKey === undefined) delete process.env.AI_GATEWAY_API_KEY;
    else process.env.AI_GATEWAY_API_KEY = oldKey;
  }
});
