import type { Criterion } from "./assessment";
export type PillarSummary = {
  text: string;
  criterionIds: string[];
  pages: number[];
  limitation: boolean;
};
const boilerplate =
  /\b(tests? assessed|criteria assessed|coverage (is )?sufficient|assessment considers|further analysis may|synthetic|contract fixture|criterion coverage)\b/i;
function sentences(text: string) {
  return Array.from(
    new Intl.Segmenter("en-GB", { granularity: "sentence" }).segment(text),
    (s) => s.segment.trim(),
  ).filter((s) => s.length >= 24 && !boilerplate.test(s));
}
export function validPillarSummary(summary?: PillarSummary) {
  return (
    !!summary &&
    summary.text.trim().length >= 24 &&
    !boilerplate.test(summary.text) &&
    Array.isArray(summary.criterionIds) &&
    Array.isArray(summary.pages)
  );
}
export function pillarSummary(tests: Criterion[]): PillarSummary {
  const assessed = tests.filter(
    (t) => t.score !== null && sentences(t.explanation).length,
  );
  const ordered = [...assessed].sort((a, b) => b.score! - a.score!);
  const strongest = ordered[0],
    weakest = ordered.at(-1);
  const chosen = [strongest, weakest].filter(
    (t, i, list): t is Criterion =>
      !!t && list.findIndex((x) => x?.id === t.id) === i,
  );
  const statements: string[] = [];
  for (const finding of chosen) {
    const source = sentences(finding.explanation);
    const first = source.find((s) => s.split(/\s+/).length <= 30) ?? source[0];
    if (first && !statements.includes(first)) statements.push(first);
    const qualification = source[1];
    if (
      first === source[0] &&
      qualification &&
      /^(however|but|although|yet|while|unless)\b/i.test(qualification)
    )
      statements.push(qualification);
  }
  if (!statements.length)
    return {
      text: "The saved evidence is too limited to explain this pillar reliably. Open the detailed findings to see what could and could not be assessed.",
      criterionIds: [],
      pages: [],
      limitation: true,
    };
  return {
    text: statements.slice(0, 3).join(" "),
    criterionIds: chosen.map((t) => t.id),
    pages: [
      ...new Set(
        chosen.flatMap((t) => [
          ...(t.visualPages || []),
          ...t.evidence.map((e) => e.page),
        ]),
      ),
    ].sort((a, b) => a - b),
    limitation: false,
  };
}

export const PILLAR_SUMMARY_INSTRUCTIONS =
  " Include pillarSummaries with one entry for each of the five pillars: exact pillar name, 15–30 plain-English words explaining what works and the main gap behind its score, and criterionIds from that pillar supporting the explanation. Describe this actual report, use everyday language, preserve important qualifications and never replace findings with counts or generic definitions. Do not choose or change scores.";
export function suppliedPillarSummary(
  name: string,
  tests: Criterion[],
  summaries?: { pillar: string; text: string; criterionIds: string[] }[],
): PillarSummary | undefined {
  const entry = summaries?.find((s) => s.pillar === name);
  if (
    !entry ||
    entry.criterionIds.length === 0 ||
    entry.criterionIds.some((id) => !tests.some((t) => t.id === id))
  )
    return;
  const refs = tests.filter((t) => entry.criterionIds.includes(t.id));
  const summary = {
    text: entry.text,
    criterionIds: entry.criterionIds,
    pages: [
      ...new Set(
        refs.flatMap((t) => [
          ...(t.visualPages || []),
          ...t.evidence.map((e) => e.page),
        ]),
      ),
    ].sort((a, b) => a - b),
    limitation: false,
  };
  return validPillarSummary(summary) ? summary : undefined;
}
