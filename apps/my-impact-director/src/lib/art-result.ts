import { suppliedPillarSummary } from "./pillar-summary";
import type { ReviewResult } from "./pipeline";
import {
  validateFindings,
  scoreFramework,
  type Page,
  type Criterion,
  type Claim,
} from "./assessment";
import { reportRating, visualCoverage } from "./report-verdict";
import { REPORT_PUBLICATION_NOTICE } from "./report-methodology";
import { LIMITATION } from "./rubric";
import { artObservations, type ArtRecord, type ArtAudit } from "./art-director";
import type { Usage } from "./ai";
export function buildArtResult(
  pages: Page[],
  context: ReviewResult["context"],
  claims: Claim[],
  findings: Criterion[],
  first: ArtRecord,
  audit: ArtAudit,
  scoringUsage: Usage,
  createdAt: string,
  version = "2.1.0",
): ReviewResult {
  const score = scoreFramework(
    validateFindings(findings, "report", pages, [], undefined, version),
    "report",
    undefined,
    version,
  );
  for (const p of score.principles)
    p.summary =
      suppliedPillarSummary(p.name, p.tests, audit.actions.pillarSummaries) ??
      p.summary;
  const calculatedOverall = score.unroundedOverall ?? score.overall;
  const inspectionComplete = visualCoverage(
    pages,
    artObservations(first),
    version,
  );
  if (
    !inspectionComplete ||
    audit.editorial.scoreConsistency !== "consistent"
  ) {
    delete score.unroundedOverall;
    score.overall = null;
    score.provisional = true;
  }
  const observations = artObservations(first),
    usages = [first.usage, scoringUsage, audit.usage];
  return {
    version: version.replace(/-report$/, ""),
    assessedAt: new Date().toISOString(),
    framework: "report",
    beta: true,
    publicationNotice: REPORT_PUBLICATION_NOTICE,
    context: context,
    claims: claims,
    scores: { report: score },
    actions: audit.actions,
    editorial: audit.editorial,
    artDirector: first,
    qualityControl: {
      method: "art-director-consistency-review",
      calculatedOverall,
      changes: audit.changes,
      contradictions: audit.contradictions,
      resolutions: audit.resolutions,
    },
    rating: reportRating(
      score,
      findings,
      audit.editorial,
      visualCoverage(pages, observations, version),
      version,
    ),
    assessmentProcess: {
      promptVersion: first.configuration.promptVersion,
      configuration: first.configuration,
      models: [...new Set(usages.map((u) => u.model))],
      inputTokens: usages.reduce((s, u) => s + u.inputTokens, 0),
      outputTokens: usages.reduce((s, u) => s + u.outputTokens, 0),
      estimatedCostUsd: usages.reduce((s, u) => s + u.cost, 0),
      modelDurationMs: usages.reduce((s, u) => s + u.duration, 0),
      elapsedMs: Date.now() - new Date(createdAt).getTime(),
      reexaminedPages: audit.inspectedPages,
    },
    visualInspection: {
      pages: observations.filter((o) => o.readable).map((o) => o.page),
      totalPages: pages.length,
      resolution: 1600,
      observations,
    },
    limitations: [
      LIMITATION,
      REPORT_PUBLICATION_NOTICE,
      "Beta AI-assisted professional editorial perspective; creative judgement is subjective and is not independent human professional assurance or technical accessibility certification.",
      ...(pages.length > 30
        ? [
            `Representative visual sample: ${first.requiredPages.join(", ")} of ${pages.length} physical pages; unseen layouts have not been judged.`,
          ]
        : [
            "Every physical page was supplied to the independent visual art-director review.",
          ]),
      ...first.review.limitations,
      ...(audit.editorial.scoreConsistency === "review_needed"
        ? [
            "An editorial inconsistency remains unresolved. No definitive total is published.",
          ]
        : []),
      ...context.limitations,
    ],
  };
}
