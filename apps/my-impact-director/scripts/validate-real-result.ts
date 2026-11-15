import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import {
  validateClaims,
  validateFindings,
  scoreFramework,
} from "../src/lib/assessment";
import { extractPages } from "../src/lib/documents";
import { criteria } from "../src/lib/rubric";
import { normalise } from "../src/lib/assessment";
import type { ReviewResult } from "../src/lib/pipeline";
const review = JSON.parse(
  await readFile("artifacts/live/genuine-anonymous-review.json", "utf8"),
);
const result = review.result as ReviewResult;
const claims = validateClaims({ claims: result.claims }, review.pages);
for (const framework of ["claims", "excellence"] as const) {
  const tests = result.scores[framework].principles.flatMap((p) => p.tests);
  const checked = validateFindings(tests, framework, review.pages, claims);
  assert.deepEqual(
    scoreFramework(checked, framework),
    result.scores[framework],
  );
}
const pages = await extractPages(
  await readFile("artifacts/live/genuine-review-export.pdf"),
);
const content = pages.map((p) => p.text).join("\n");
assert.match(content, /Social Impact Claims Code/);
assert.match(content, /Social Impact Excellence/);
assert.match(content, /Methodology/);
assert.match(content, /PDF p\./);
for (const framework of ["claims", "excellence"] as const)
  for (const p of result.scores[framework].principles)
    for (const f of p.tests)
      assert.ok(
        normalise(content).includes(
          normalise(criteria(framework).find((c) => c.id === f.id)!.question),
        ),
        `PDF contains the question for ${f.id}`,
      );
const checks = {
  organisation: result.context.organisation,
  sourcePages: review.pages.length,
  claims: claims.length,
  validatedTests: 40,
  claimsScore: result.scores.claims.overall,
  excellenceScore: result.scores.excellence.overall,
  pdfPages: pages.length,
  cost: review.cost_usd,
  attempts: review.attempts,
};
await writeFile(
  "artifacts/live/result-validation.json",
  JSON.stringify(checks, null, 2),
);
console.log(JSON.stringify(checks));
