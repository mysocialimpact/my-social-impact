import { test } from "node:test";
import assert from "node:assert/strict";
import {
  pillarSummary,
  suppliedPillarSummary,
  validPillarSummary,
} from "../src/lib/pillar-summary";
import type { Criterion } from "../src/lib/assessment";
const finding = (
  id: string,
  score: number,
  explanation: string,
): Criterion => ({
  id,
  score,
  explanation,
  status: "assessed",
  evidence: [{ page: 4, quote: "A verified source passage." }],
  limitations: [],
  confidence: "high",
  improvement: "Use clearer labels.",
  claimIds: [],
});
test("saved summaries retain source qualifications and supporting pages without changing scores", () => {
  const tests = [
      finding(
        "report.1.1",
        3,
        "The headings give readers a clear route. However, the key conclusion appears late.",
      ),
      finding(
        "report.1.2",
        1,
        "Long paragraphs make the dense opening difficult to skim.",
      ),
    ],
    before = JSON.stringify(tests);
  const result = pillarSummary(tests);
  assert.match(result.text, /However, the key conclusion/);
  assert.deepEqual(result.pages, [4]);
  assert.equal(JSON.stringify(tests), before);
});
test("boilerplate and cross-pillar generated summaries are rejected", () => {
  const tests = [
    finding("claims.1.1", 2, "Five tests assessed. Coverage is sufficient."),
  ];
  assert.equal(pillarSummary(tests).limitation, true);
  assert.equal(
    validPillarSummary({
      text: "Five tests assessed. Coverage is sufficient.",
      pages: [],
      criterionIds: [],
      limitation: false,
    }),
    false,
  );
  assert.equal(
    suppliedPillarSummary("Evidence", tests, [
      {
        pillar: "Evidence",
        text: "The report describes its programme but provides limited methods for checking the reported results.",
        criterionIds: ["claims.2.1"],
      },
    ]),
    undefined,
  );
});
