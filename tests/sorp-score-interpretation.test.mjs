import assert from "node:assert/strict";
import test from "node:test";
import { historicalSnapshotInterpretation, mandatoryDistribution, mandatoryInterpretation } from "../app/sorp-score-interpretation.ts";

const finding = (classification, answer) => ({ classification, answer });

test("mandatory distribution uses applicable MUST findings only and excludes genuine N/A", () => {
  const findings = [
    ...Array.from({ length: 9 }, () => finding("MUST", "mostly")),
    ...Array.from({ length: 3 }, () => finding("MUST", "partly")),
    finding("MUST", "limited"),
    finding("MUST", "not_applicable"),
    finding("SHOULD", "yes"),
  ];
  assert.deepEqual(mandatoryDistribution(findings), { yes: 0, mostly: 9, partly: 3, limited: 1, not_yet: 0, not_sure: 0 });
  const snapshot = historicalSnapshotInterpretation({ findings });
  assert.equal(snapshot.applicable, 13);
  assert.equal(snapshot.clearlyDemonstrated, 0);
  assert.match(snapshot.reportingStrengthExplanation, /not a SORP compliance percentage/i);
  assert.match(snapshot.distinction, /does not override unmet mandatory requirements/i);
});

test("plain-English interpretation is selected deterministically from the distribution", () => {
  assert.match(mandatoryInterpretation({ yes: 0, mostly: 9, partly: 3, limited: 1, not_yet: 0, not_sure: 0 }), /much of the information SORP expects/i);
  assert.match(mandatoryInterpretation({ yes: 0, mostly: 2, partly: 8, limited: 2, not_yet: 1, not_sure: 0 }), /important elements are still incomplete or unclear/i);
  assert.match(mandatoryInterpretation({ yes: 0, mostly: 1, partly: 2, limited: 5, not_yet: 4, not_sure: 1 }), /substantial reporting work/i);
  assert.match(mandatoryInterpretation({ yes: 0, mostly: 1, partly: 1, limited: 0, not_yet: 0, not_sure: 6 }), /could not be confirmed/i);
});
