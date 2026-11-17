import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bands,
  displayScore,
  brief,
  scoreColours,
} from "../src/lib/publication";
test("all ten publication bands are taken from the rounded display number", () => {
  bands.forEach((label, i) => {
    for (const score of [i * 10, i * 10 + 9])
      assert.equal(displayScore(score)?.label, label);
  });
  assert.deepEqual(displayScore(89.5), {
    percent: 90,
    label: "Excellent",
    colour: scoreColours[9],
  });
  assert.equal(displayScore(100)?.label, "Excellent");
  assert.deepEqual(displayScore(15, 20), {
    percent: 75,
    label: "Good",
    colour: scoreColours[7],
  });
  assert.equal(displayScore(null), null);
  assert.equal(displayScore(101), null);
  assert.equal(
    brief(
      "The chart is hard to interpret. Label each axis directly. However, keep the original units.",
      true,
    ),
    "Label each axis directly. However, keep the original units.",
  );
  assert.equal(
    brief(
      "The chart gives a clear trend. However, the scale is missing. See the appendix.",
    ),
    "The chart gives a clear trend. However, the scale is missing.",
  );
});

import { reportTotal } from "../src/lib/report-total";
import type { ReviewResult } from "../src/lib/pipeline";
test("audited design total requires coverage, complete inspection and consistency", () => {
  const r = {
    version: "2.1.0",
    scores: {
      report: {
        overall: null,
        provisional: true,
        coverage: 25,
        principles: Array.from({ length: 5 }, () => ({
          coverage: 5,
          score: 10,
        })),
      },
    },
    qualityControl: { calculatedOverall: 51.5 },
    editorial: { scoreConsistency: "consistent" },
    artDirector: { requiredPages: [1, 2] },
    visualInspection: { pages: [1, 2] },
  } as unknown as ReviewResult;
  assert.equal(reportTotal(r), 51.5);
  r.visualInspection!.pages = [1];
  assert.equal(reportTotal(r), null);
  r.visualInspection!.pages = [1, 2];
  r.editorial!.scoreConsistency = "review_needed";
  assert.equal(reportTotal(r), null);
});
