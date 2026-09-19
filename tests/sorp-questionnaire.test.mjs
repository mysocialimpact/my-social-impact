import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  coreQuestions,
  eligibilityFor,
  readinessStages,
  relevantAdditionalChecks,
  scoreForAnswer,
  stageForQuestion,
  tierFromSetup,
  tierLabel,
} from "../app/sorp-questionnaire.ts";

const dataPath = new URL("../app/sorp-questionnaire.ts", import.meta.url);
const experiencePath = new URL("../app/sorp-assessment.tsx", import.meta.url);

test("SORP snapshot keeps one stable 15-question scoring method", async () => {
  const source = await readFile(dataPath, "utf8");
  const coreBlock = source.slice(source.indexOf("export const coreQuestions"), source.indexOf("export const additionalChecks"));
  const questionIds = [...coreBlock.matchAll(/^\s+id: (\d+),$/gm)].map((match) => Number(match[1]));

  assert.deepEqual(questionIds, Array.from({ length: 15 }, (_, index) => index + 1));
  assert.equal((coreBlock.match(/affectsScore: true/g) ?? []).length, 15);
  assert.match(source, /15 questions × maximum 4 points|scoreForAnswer/);
  assert.match(source, /"MUST" \| "SHOULD" \| "MAY" \| "JUDGEMENT" \| "MSI_READINESS"/);
});

const baseSetup = {
  role: "staff",
  jurisdiction: "ew",
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  accounts: "accruals",
  income: "tier2",
  nearBoundary: false,
  activities: ["none"],
};

test("eligibility stays helpful for non-standard and uncertain routes", () => {
  assert.match(eligibilityFor({ ...baseSetup, accounts: "receipts" }).status, /MAY NOT APPLY/);
  assert.match(eligibilityFor({ ...baseSetup, startDate: "2025-12-31" }).status, /MAY NOT APPLY/);
  assert.match(eligibilityFor({ ...baseSetup, accounts: "not_sure" }).status, /PROVISIONAL/);
  assert.match(eligibilityFor({ ...baseSetup, jurisdiction: "roi" }).status, /PROVISIONAL/);
});

test("tier logic keeps uncertainty and the Tier 1 / Tier 2 boundary visible", () => {
  assert.equal(tierFromSetup({ ...baseSetup, income: "unsure" }), null);
  assert.equal(tierLabel({ ...baseSetup, income: "unsure" }), "Not yet confirmed");
  assert.equal(tierFromSetup({ ...baseSetup, income: "tier1_high", nearBoundary: true }), null);
  assert.equal(tierLabel({ ...baseSetup, income: "tier1_high", nearBoundary: true }), "Tier 1 / Tier 2 borderline");
  assert.equal(tierFromSetup({ ...baseSetup, income: "tier3" }), "tier3");
});

test("additional checks respond transparently to activities and tier", () => {
  assert.deepEqual(relevantAdditionalChecks(baseSetup).map((check) => check.id), []);
  assert.deepEqual(relevantAdditionalChecks({ ...baseSetup, activities: ["not_sure"] }).map((check) => check.id), ["volunteers", "grant_making", "social_investment"]);
  assert.deepEqual(relevantAdditionalChecks({ ...baseSetup, activities: ["volunteers", "grant_making", "group"] }).map((check) => check.id), ["volunteers", "grant_making", "group"]);
  assert.deepEqual(relevantAdditionalChecks({ ...baseSetup, income: "tier3", activities: ["fundraising", "investments"] }).map((check) => check.id), ["fundraising", "investments", "sustainability"]);
});

test("the main score always uses the same 15 core answers", () => {
  const allNotSure = Object.fromEntries(coreQuestions.map((question) => [question.id, "not_sure"]));
  const allClear = Object.fromEntries(coreQuestions.map((question) => [question.id, "yes"]));
  const calculate = (answers) => Math.round(coreQuestions.reduce((total, question) => total + scoreForAnswer(answers[question.id]), 0) / 60 * 100);

  assert.equal(calculate(allNotSure), 0);
  assert.equal(calculate(allClear), 100);
  assert.equal(coreQuestions.length, 15);
});

test("the Snapshot and conversation share the six visible readiness stages", () => {
  assert.deepEqual([...readinessStages], [
    "Your SORP context",
    "Objectives & activities",
    "Achievements & performance",
    "Plans for future periods",
    "Trustees’ Annual Report readiness",
    "Additional SORP checks",
  ]);
  assert.deepEqual(coreQuestions.map(stageForQuestion), [2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 5, 5]);
});

test("SORP snapshot contains exactly five setup questions and transparent conditional checks", async () => {
  const source = await readFile(experiencePath, "utf8");

  assert.deepEqual([...source.matchAll(/Setup question (\d{2}) of 05/g)].map((match) => match[1]), ["01", "02", "03", "04", "05"]);
  assert.match(source, /These checks create separate SORP flags\. They do not change the main 0–100 score/);
  assert.match(source, /Why am I seeing this\?/);
  assert.match(source, /Save &amp; exit/);
  assert.match(source, /\/are-you-sorp-ready\/results/);
  assert.match(source, /window\.localStorage\.setItem\(RESULT_KEY/);
  assert.match(source, /Snapshot will be carried into the conversation/);
  assert.match(source, /\/are-you-sorp-ready\/conversation\?from=snapshot/);
  assert.doesNotMatch(source, /email.*required|required.*email/i);
});
