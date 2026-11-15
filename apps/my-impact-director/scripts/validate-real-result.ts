import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import {
  validateClaims,
  validateFindings,
  scoreFramework,
} from "../src/lib/assessment";
import { getDocumentProxy, extractText } from "unpdf";
import { criteria } from "../src/lib/rubric";
import { normalise } from "../src/lib/assessment";
import type { ReviewResult } from "../src/lib/pipeline";
const review = JSON.parse(
  await readFile(
    process.argv[3] || "artifacts/live/genuine-anonymous-review.json",
    "utf8",
  ),
);
const result = review.result as ReviewResult;
const frameworks = (["claims", "excellence"] as const).filter(
  (f) => !!result.scores[f],
);
const claims = validateClaims({ claims: result.claims }, review.pages);
for (const framework of frameworks) {
  const tests = result.scores[framework]!.principles.flatMap((p) => p.tests);
  const checked = validateFindings(tests, framework, review.pages, claims);
  assert.deepEqual(
    scoreFramework(checked, framework),
    result.scores[framework],
  );
}
const pdf = await getDocumentProxy(
  new Uint8Array(
    await readFile(
      process.argv[2] || "artifacts/live/genuine-review-export.pdf",
    ),
  ),
  { isEvalSupported: false },
);
const extracted = await extractText(pdf, { mergePages: false });
const pages = extracted.text;
const content = pages
  .join("\n")
  .replace(
    /Developed by My Social Impact \| Built by The Ideas Shed\s*\d+\s*\/\s*\d+/g,
    " ",
  );
await pdf.destroy();
for (const framework of frameworks)
  assert.ok(
    content.includes(
      framework === "claims"
        ? "Social Impact Claims Code"
        : "Social Impact Excellence",
    ),
  );
assert.match(content, /Methodology/);
assert.match(content, /PDF p\./);
for (const framework of frameworks)
  for (const p of result.scores[framework]!.principles)
    for (const f of p.tests)
      assert.ok(
        normalise(content).includes(
          normalise(criteria(framework).find((c) => c.id === f.id)!.question),
        ),
        `PDF contains the question for ${f.id}`,
      );
const allCitations = [
  ...result.claims.flatMap((c) => [
    { page: c.page, quote: c.text },
    ...c.evidence,
  ]),
  ...Object.values(result.scores).flatMap((s) =>
    s.principles.flatMap((p) => p.tests.flatMap((f) => f.evidence)),
  ),
];
const evidenceText = normalise(content).replace(
  /developed by my social impact \| built by the ideas shed\s*\d+\s*\/\s*\d+/g,
  " ",
);
for (const citation of allCitations)
  assert.ok(
    normalise(evidenceText).includes(normalise(citation.quote)),
    `PDF retains full source passage from page ${citation.page}`,
  );
const checks = {
  organisation: result.context.organisation,
  sourcePages: review.pages.length,
  claims: claims.length,
  validatedTests: frameworks.length * 20,
  scores: Object.fromEntries(
    frameworks.map((f) => [f, result.scores[f]!.overall]),
  ),
  pdfPages: pages.length,
  cost: review.cost_usd,
  attempts: review.attempts,
};
await writeFile(
  process.argv[4] || "artifacts/live/result-validation.json",
  JSON.stringify(checks, null, 2),
);
console.log(JSON.stringify(checks));
