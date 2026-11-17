import { z } from "zod";
import {
  actionSchema,
  type Scores,
  type Criterion,
  type Page,
} from "./assessment";
import { visualSample, type VisualObservation } from "./report-visual";
import { isRevisedReport, REPORT_VERSION } from "./report-methodology";
const readerAnswer = z
  .object({
    finding: z.string().min(20).max(1500),
    page: z.number().int().positive().nullable(),
    access: z.enum(["easy", "effortful", "not_found"]),
  })
  .strict();
export const editorialSchema = z
  .object({
    verdict: z.string().min(40).max(3000),
    attention: z.string().min(30).max(2000),
    scoreConsistency: z.enum(["consistent", "review_needed"]),
    scoreExplanation: z.string().min(30).max(2000),
    readerTest: z
      .object({
        outcomes: readerAnswer,
        scale: readerAnswer,
        limitations: readerAnswer,
        nextSteps: readerAnswer,
      })
      .strict(),
  })
  .strict();
export const reportActionsSchema = actionSchema
  .extend({ editorial: editorialSchema })
  .strict();
export type EditorialVerdict = z.infer<typeof editorialSchema>;
export type ReportRating = {
  label:
    | "Excellent"
    | "Strong"
    | "Adequate"
    | "Needs substantial improvement"
    | "Provisional"
    | "Poor"
    | "Significant improvement needed"
    | "Adequate, with important weaknesses"
    | "Strong professional communication"
    | "Exceptional";
  reasons: string[];
  readerTestPassed: boolean;
  rule: string;
};
export const RATING_RULE =
  "Excellent requires an unrounded raw total ≥80, every pillar ≥50% of its weight, no serious unresolved readability/accessibility barrier, and all four simulated two-minute reader questions easy to answer, with the editorial verdict consistent with the score. Critical legibility, contrast, reading-order or essential-alternative criteria scored 0/1 count as unresolved barriers. These checks affect the rating, never the numerical total.";
export function validateEditorial(
  value: unknown,
  pages: Page[],
  observations: VisualObservation[],
) {
  const editorial = editorialSchema.parse(value),
    inspected = new Set(
      observations.filter((o) => o.readable).map((o) => o.page),
    );
  for (const a of Object.values(editorial.readerTest)) {
    if (
      a.page !== null &&
      (!pages.some((p) => p.page === a.page) || !inspected.has(a.page))
    )
      throw Error("Reader test needs an inspected physical page");
    if (a.access !== "not_found" && a.page === null)
      throw Error("Reader answer needs a physical page");
  }
  return editorial;
}
export function reportRating(
  score: Scores,
  findings: Criterion[],
  editorial: EditorialVerdict,
  visualAvailable = true,
  version = "2.0.0",
): ReportRating {
  const readerTestPassed = Object.values(editorial.readerTest).every(
      (a) => a.access === "easy",
    ),
    reasons: string[] = [];
  if (!visualAvailable)
    reasons.push(
      "Rendered-page inspection is incomplete or unavailable. No overall score is published; this is an assessment limitation, not evidence of poor report design.",
    );
  if (score.provisional || score.overall === null)
    reasons.push(
      "Coverage or visual evidence is insufficient for an overall rating.",
    );
  const weak = score.principles
    .filter((p) => p.score === null || p.score / (p.maximum ?? 20) < 0.5)
    .map((p) => p.name);
  if (weak.length)
    reasons.push("Pillars below adequate: " + weak.join(", ") + ".");
  if (
    findings.some(
      (f) =>
        f.barrier === "serious" ||
        (["report.1.1", "report.5.1", "report.5.3", "report.5.4"].includes(
          f.id,
        ) &&
          f.score !== null &&
          f.score <= 1),
    )
  )
    reasons.push(
      "A serious readability or accessibility barrier remains unresolved.",
    );
  if (!readerTestPassed)
    reasons.push(
      "The simulated two-minute reader test needs effort or leaves a question unanswered.",
    );
  if (editorial.scoreConsistency !== "consistent")
    reasons.push(
      "The editorial verdict flags the numerical score for human review.",
    );
  const raw = score.principles.reduce(
    (n, p) =>
      n +
      ((p.maximum ?? 20) *
        p.tests
          .filter((f) => f.score !== null)
          .reduce((a, f) => a + f.score!, 0)) /
        (4 * p.coverage),
    0,
  );
  if (isRevisedReport(version))
    return {
      label:
        score.provisional || score.overall === null
          ? "Provisional"
          : raw < 40
            ? "Poor"
            : raw < 60
              ? "Significant improvement needed"
              : raw < 75
                ? "Adequate, with important weaknesses"
                : raw < 90
                  ? "Strong professional communication"
                  : "Exceptional",
      reasons,
      readerTestPassed,
      rule: "0–39 Poor; 40–59 Significant improvement needed; 60–74 Adequate, with important weaknesses; 75–89 Strong professional communication; 90–100 Exceptional. Derived from validated weighted criteria, never a model-selected total. Beta AI-assisted editorial judgement; no independent human validation. Editorial inconsistency or insufficient coverage withholds the overall score.",
    };
  return {
    label: score.provisional
      ? "Provisional"
      : raw >= 80 && !reasons.length
        ? "Excellent"
        : raw >= 65
          ? "Strong"
          : raw >= 50
            ? "Adequate"
            : "Needs substantial improvement",
    reasons,
    readerTestPassed,
    rule: RATING_RULE,
  };
}
export function visualCoverage(
  pages: Page[],
  observations: VisualObservation[],
) {
  const inspected = new Set(
    observations.filter((o) => o.readable).map((o) => o.page),
  );
  return visualSample(pages).every((n) => inspected.has(n));
}
export const EDITORIAL_PROMPT = `Add a whole-report editorial verdict: does this publication hold a new reader's attention through purposeful editing and art direction? Attention is qualitative, never a sixth numerical pillar. Simulate a two-minute scan: could a new reader quickly find actual main outcomes, their scale, limitations and specific next steps? For each answer give what the reader learns, its inspected physical page (null if not found), and access easy/effortful/not_found. Mission or long-term ambition is not an achieved outcome. Do not claim a real timed user test. Compare the numeric score with that experience: flag review_needed if they conflict, explain why, and never rewrite or force the numerical total. Serious barriers and the rating rule are visible separately. Assess only supplied material, and acknowledge genuine candour and authentic human content.`;

export function actionInstructions(report: boolean, v2: boolean) {
  return (
    (report
      ? "Write an editorial judgement and ranked creative improvement plan. Include a final action titled Suggested creative direction, a specific creative brief grounded in criterion IDs, with issue, why, physical page, improvement and likely benefit. Do not assess validity of underlying impact claims. "
      : "") +
    (v2 ? EDITORIAL_PROMPT : "") +
    "Write a concise executive summary and specific prioritised action plan using ONLY validated findings. Each action must cite existing criterion IDs and say what to change, why, and how. Distinguish quick wording changes, important evidence/reporting improvements, and longer-term measurement/management improvements. Do not invent achievements, comparisons, benchmarks or new source facts. If evidence is weak, a strength may be a clearly qualified useful starting point. Do not describe provisional assessments as definitive scores."
  );
}
