/** Zero model calls. Recomputes explicit reference judgements, never calls them measured AI results. */
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import {
  referenceCases,
  fixtureEvidence,
} from "../tests/impact-edit-reference";
import { criteria } from "../src/lib/rubric";
import { scoreFramework, type Criterion } from "../src/lib/assessment";
import {
  LEGACY_REPORT_VERSION as REPORT_VERSION,
  reportV2Criteria,
  REPORT_SCORING,
} from "../src/lib/report-methodology-2-0-0";
await fs.mkdir("artifacts/impact-edit-v2", { recursive: true });
let report = `# Offline rubric comparison\n\nThese are assistant-authored reference judgements after page inspection, not revised model results or independent human sign-off. Only Profit Impact's original v1 result is an actual stored production assessment. No model or email calls were made.\n\n${REPORT_SCORING}\n`;
const output = [];
for (const c of referenceCases) {
  function findings(scores: (number | null)[][], version: string): Criterion[] {
    return criteria("report", version).map((x, i) => ({
      id: x.id,
      status: scores.flat()[i] === null ? "unassessable" : "assessed",
      score: scores.flat()[i],
      explanation: (c.notes.length ? c.notes : fixtureEvidence)[i][1],
      evidence: [],
      visualPages: [(c.notes.length ? c.notes : fixtureEvidence)[i][0]],
      limitations: scores.flat()[i] === null ? ["No assistive user test."] : [],
      anchorReason:
        "Explicit offline rubric reference judgement, not a model output.",
      barrier: "none",
      improvement:
        "Use the criterion evidence and next anchor to guide revision.",
      confidence: "medium",
      claimIds: [],
    }));
  }
  const old = scoreFramework(
      findings(c.old, "1.0.0"),
      "report",
      undefined,
      "1.0.0",
    ),
    next = scoreFramework(
      findings(c.scores, REPORT_VERSION),
      "report",
      undefined,
      REPORT_VERSION,
    );
  if (c.name === "profit-impact") assert.equal(old.overall, 84);
  output.push({ name: c.name, oldSource: c.oldSource, old, next });
  report += `\n## ${c.name}\n\nOld source: ${c.oldSource}.\n\nv1 reference: **${old.overall}/100** — ${old.principles.map((p) => p.name + " " + p.score + "/20").join("; ")}.\n\nv2 reference: **${next.overall}/100** — ${next.principles.map((p) => p.name + " " + p.score + "/" + p.maximum).join("; ")}.\n\n| Criterion | Score | Physical page | Reference reasoning |\n|---|---:|---:|---|\n`;
  next.principles
    .flatMap((p) => p.tests)
    .forEach((f, i) => {
      report += `| ${reportV2Criteria[i].question} | ${f.score ?? "Unassessable"} | ${f.visualPages?.join(", ")} | ${f.explanation} |\n`;
    });
}
assert.ok(
  output.find((c) => c.name === "excellent-designed")!.next.overall! >= 80,
);
assert.equal(
  output.find((c) => c.name === "simple-effective")!.old.overall,
  output.find((c) => c.name === "simple-effective")!.next.overall,
);
await fs.writeFile(
  "artifacts/impact-edit-v2/offline-reference.json",
  JSON.stringify(output, null, 2),
);
await fs.writeFile("artifacts/impact-edit-v2/offline-comparison.md", report);
console.log(
  output.map((c) => ({
    name: c.name,
    old: c.old.overall,
    newReference: c.next.overall,
    source: "offline reference; not a new AI assessment",
  })),
);
