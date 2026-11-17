import type { ReviewResult } from "./pipeline";
// Reopen stored art-director assessments using their audited total. Never invent
// a total for incomplete inspection, missing criteria or unresolved findings.
export function reportTotal(result: ReviewResult): number | null {
  const score = result.scores.report;
  if (!score) return null;
  if (!score.provisional && score.overall !== null)
    return score.unroundedOverall ?? score.overall;
  if (result.displayOverall !== undefined) return result.displayOverall;
  const total = result.qualityControl?.calculatedOverall;
  if (
    !/^2\.1\./.test(result.version) ||
    total == null ||
    !Number.isFinite(total) ||
    total < 0 ||
    total > 100 ||
    score.coverage < 22 ||
    score.principles.length !== 5 ||
    score.principles.some((p) => p.coverage < 4 || p.score === null) ||
    result.editorial?.scoreConsistency !== "consistent" ||
    !result.visualInspection?.pages?.length ||
    !result.artDirector?.requiredPages?.every((p) =>
      result.visualInspection!.pages.includes(p),
    )
  )
    return null;
  return total;
}
