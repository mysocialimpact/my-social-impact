import {
  REPORT_VERSION,
  isReportV2,
  reportWeights,
} from "./report-methodology";
import { z } from "zod";
import { COVERAGE, testsPerPillar, criteria, type Framework } from "./rubric";
const text = z.string().trim().min(1).max(5000);
export const citationSchema = z
  .object({
    page: z.number().int().min(1),
    quote: z.string().trim().min(12).max(2000),
  })
  .strict();
export const pageSchema = z
  .object({
    page: z.number().int().positive(),
    text: z.string().max(40000),
    extraction: z.enum(["text", "ocr"]),
    readable: z.boolean(),
  })
  .strict();
export type Page = z.infer<typeof pageSchema>;
export const criterionSchema = z
  .object({
    id: z.string(),
    status: z.enum([
      "assessed",
      "not_demonstrated",
      "not_applicable",
      "unassessable",
    ]),
    score: z.number().int().min(0).max(4).nullable(),
    explanation: text,
    evidence: z.array(citationSchema).max(8),
    limitations: z.array(text).max(8),
    improvement: text,
    confidence: z.enum(["high", "medium", "low"]),
    claimIds: z.array(z.string()).max(40),
    visualPages: z.array(z.number().int().positive()).optional(),
    anchorReason: z.string().min(20).max(3000).optional(),
    barrier: z.enum(["none", "serious"]).optional(),
  })
  .strict();
export type Criterion = z.infer<typeof criterionSchema>;
export const claimSchema = z
  .object({
    id: z.string(),
    text,
    page: z.number().int().positive(),
    classification: z.enum([
      "activity",
      "output",
      "outcome",
      "impact",
      "causal",
    ]),
    outcome: text,
    materiality: z.enum(["high", "medium", "low"]),
    evidence: z.array(citationSchema).max(8),
    adequacy: z.enum(["supported", "partial", "unsupported", "uncertain"]),
    causal: z.boolean(),
    assumptions: z.array(text).max(8),
    exaggerationRisk: z.enum(["high", "medium", "low", "uncertain"]),
    defensibleWording: z.string().max(3000),
  })
  .strict();
export type Claim = z.infer<typeof claimSchema>;
export const contextSchema = z
  .object({
    organisation: text,
    title: text,
    reportingPeriod: z.string().max(100).nullable(),
    beneficiaries: z.array(text).max(15),
    activities: z.array(text).max(15),
    outcomes: z.array(text).max(15),
    context: text,
    limitations: z.array(text).max(15),
  })
  .strict();
export const claimsSchema = z
  .object({ claims: z.array(claimSchema).max(40) })
  .strict();
export const findingsSchema = z
  .object({ findings: z.array(criterionSchema).length(4) })
  .strict();
export const actionSchema = z
  .object({
    summary: text,
    strengths: z.array(text).min(1).max(5),
    opportunities: z.array(text).min(1).max(5),
    actions: z
      .array(
        z
          .object({
            priority: z.enum(["quick", "important", "longer_term"]),
            title: text,
            detail: text,
            criterionIds: z.array(z.string()).min(1).max(8),
          })
          .strict(),
      )
      .min(3)
      .max(12),
  })
  .strict();
export type Actions = z.infer<typeof actionSchema>;
export const normalise = (s: string) =>
  s
    .normalize("NFKC")
    .replace(/\u00ad/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
export function validateCitation(
  c: z.infer<typeof citationSchema>,
  pages: Page[],
) {
  const page = pages.find((p) => p.page === c.page);
  if (!page?.readable || !normalise(page.text).includes(normalise(c.quote)))
    throw new Error(`Unverified quotation on PDF page ${c.page}.`);
}
export function validateClaims(input: unknown, pages: Page[]): Claim[] {
  const { claims } = claimsSchema.parse(input);
  if (new Set(claims.map((c) => c.id)).size !== claims.length)
    throw new Error("Duplicate claim identifiers.");
  for (const c of claims) {
    validateCitation({ page: c.page, quote: c.text }, pages);
    c.evidence.forEach((e) => validateCitation(e, pages));
    if (c.adequacy === "supported" && !c.evidence.length)
      throw new Error("Supported claim has no evidence.");
  }
  return claims;
}
export function validateFindings(
  input: unknown,
  framework: Framework,
  pages: Page[],
  claims: Claim[],
  principle?: number,
  version = framework === "report" ? REPORT_VERSION : "1.0.0",
): Criterion[] {
  const findings = z.array(criterionSchema).parse(input);
  const expected = criteria(framework, version)
    .filter(
      (_, i) =>
        principle === undefined ||
        Math.floor(i / testsPerPillar(framework)) === principle,
    )
    .map((c) => c.id);
  if (
    findings.length !== expected.length ||
    new Set(findings.map((f) => f.id)).size !== expected.length ||
    findings.some((f) => !expected.includes(f.id))
  )
    throw new Error("Missing or duplicated criteria.");
  for (const f of findings) {
    f.evidence.forEach((e) => validateCitation(e, pages));
    if (f.claimIds.some((id) => !claims.some((c) => c.id === id)))
      throw new Error("Unknown claim reference.");
    if (f.status === "not_demonstrated" && f.score !== 0)
      throw new Error("Not demonstrated must score zero.");
    if (
      ["not_applicable", "unassessable"].includes(f.status) &&
      f.score !== null
    )
      throw new Error("Excluded tests cannot have scores.");
    if (
      f.status === "assessed" &&
      (f.score === null ||
        (f.score === 0 && !(framework === "report" && isReportV2(version))) ||
        (!f.evidence.length &&
          !(framework === "report" && f.visualPages?.length)))
    )
      throw new Error("A positive score requires verified evidence.");
    if (
      ["not_applicable", "unassessable"].includes(f.status) &&
      !f.limitations.length
    )
      throw new Error("An excluded test needs a limitation.");
    if (
      f.status === "not_demonstrated" &&
      pages.some((p) => !p.readable) &&
      !(framework === "report" && isReportV2(version) && f.visualPages?.length)
    )
      throw new Error("Missing content prevents reliable absence judgements.");
  }
  return expected.map((id) => findings.find((f) => f.id === id)!);
}
export function scoreFramework(
  findings: Criterion[],
  framework: Framework,
  thresholds: {
    minimumPerPrinciple: number;
    minimumTotal: number;
  } = framework === "report"
    ? { minimumPerPrinciple: 4, minimumTotal: 22 }
    : COVERAGE,
  version = framework === "report" ? REPORT_VERSION : "1.0.0",
) {
  const expected = criteria(framework, version);
  if (
    findings.length !== expected.length ||
    new Set(findings.map((f) => f.id)).size !== expected.length ||
    findings.some((f) => !expected.some((c) => c.id === f.id))
  )
    throw new Error("A framework needs all expected test outcomes.");
  const principles = Array.from({ length: 5 }, (_, i) => {
    const tests = expected
      .slice(i * testsPerPillar(framework), (i + 1) * testsPerPillar(framework))
      .map((c) => findings.find((f) => f.id === c.id)!);
    const assessable = tests.filter(
      (f) => f.status === "assessed" || f.status === "not_demonstrated",
    );
    if (
      assessable.some(
        (f) =>
          f.score === null ||
          !Number.isInteger(f.score) ||
          f.score! < 0 ||
          f.score! > 4 ||
          (f.status === "not_demonstrated" && f.score !== 0),
      )
    )
      throw new Error("Invalid scoring input.");
    const maximum =
      framework === "report" && isReportV2(version) ? reportWeights[i] : 20;
    return {
      maximum,
      name: expected[i * testsPerPillar(framework)].principle,
      score: assessable.length
        ? Math.round(
            (assessable.reduce((n, f) => n + f.score!, 0) / assessable.length) *
              (maximum / 4) *
              100,
          ) / 100
        : null,
      coverage: assessable.length,
      tests,
    };
  });
  const coverage = principles.reduce((n, p) => n + p.coverage, 0);
  const provisional =
    coverage < thresholds.minimumTotal ||
    principles.some((p) => p.coverage < thresholds.minimumPerPrinciple);
  return {
    overall: provisional
      ? null
      : Math.round(
          (framework === "report" && isReportV2(version)
            ? principles.reduce(
                (n, p) =>
                  n +
                  (p.maximum *
                    p.tests
                      .filter((f) => f.score !== null)
                      .reduce((a, f) => a + f.score!, 0)) /
                    (4 * p.coverage),
                0,
              )
            : principles.reduce((n, p) => n + p.score!, 0)) * 100,
        ) / 100,
    provisional,
    coverage,
    principles,
  };
}
export type Scores = ReturnType<typeof scoreFramework>;
