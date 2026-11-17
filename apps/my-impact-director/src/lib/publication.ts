import type { ReviewResult } from "./pipeline";
import { criteria, type Framework } from "./rubric";
import { pillarMaximum } from "./report-methodology";

export const bands = [
  "Critical",
  "Poor",
  "Weak",
  "Limited",
  "Developing",
  "Fair",
  "Adequate",
  "Good",
  "Strong",
  "Excellent",
] as const;
export function displayScore(value: number | null, maximum = 100) {
  if (
    value === null ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > maximum ||
    !(maximum > 0)
  )
    return null;
  const percent = Math.round((value / maximum) * 100);
  return { percent, label: bands[Math.min(9, Math.floor(percent / 10))] };
}
export const identity = {
  claims: {
    logo: "claims-code.png",
    colour: "#101b35",
    headline: "Good claims build trust.",
    invitation: "Let’s make yours stronger.",
    note: "An indicative review of the evidence and integrity of the claims in this document.",
  },
  excellence: {
    logo: "excellence.png",
    colour: "#184c46",
    headline: "Impact deserves to be managed.",
    invitation: "Let’s put the findings to work.",
    note: "This review describes the management practices evidenced in your report. A full organisational assessment requires further evidence.",
  },
  report: {
    logo: "the-impact-edit-horizontal.png",
    colour: "#ad340d",
    headline: "Your impact deserves to be seen.",
    invitation: "Let’s bring your report to life.",
    note: "Beta · AI-assisted creative judgement. Pillar estimates are experimental and involve editorial subjectivity.",
  },
} as const;
// Select complete source sentences and keep qualifications with the preceding sentence.
export function brief(text: string, recommendation = false) {
  const sentences = Array.from(
    new Intl.Segmenter("en-GB", { granularity: "sentence" }).segment(text),
    (s) => s.segment.trim(),
  ).filter(Boolean);
  const action = recommendation
    ? sentences.findIndex((line) =>
        /^(add|bring|break|clarify|compare|connect|cut|define|describe|distinguish|edit|explain|give|group|include|introduce|label|lead|link|make|move|name|pair|place|prioritise|provide|publish|put|reduce|remove|replace|rewrite|separate|set|shorten|show|simplify|split|start|state|support|use|write)\b/i.test(
          line,
        ),
      )
    : -1;
  const start = Math.max(0, action);
  const count =
    /^(but|however|although|except|yet|while|unless|this limit)\b/i.test(
      sentences[start + 1] || "",
    )
      ? 2
      : 1;
  return sentences.slice(start, start + count).join(" ") || text;
}
export function publication(result: ReviewResult, framework: Framework) {
  const score = result.scores[framework]!;
  const tests = score.principles.flatMap((p) => p.tests);
  const priorities = result.actions.actions.slice(0, 3).map((a) => {
    const linked = tests.filter((t) => a.criterionIds.includes(t.id));
    const pages = [
      ...new Set(
        linked.flatMap((t) => [
          ...(t.visualPages || []),
          ...t.evidence.map((e) => e.page),
        ]),
      ),
    ].sort((a, b) => a - b);
    return { ...a, summary: brief(a.detail, true), pages };
  });
  return {
    overall:
      score.provisional || score.overall === null
        ? null
        : displayScore(score.unroundedOverall ?? score.overall),
    withheld:
      framework === "report" && result.publicationNotice
        ? "Overall score under review"
        : "Insufficient evidence to score",
    verdict: brief(result.editorial?.verdict || result.actions.summary),
    priorities,
    pillars: score.principles.map((p) => {
      const maximum = pillarMaximum(p);
      const finding = p.tests
        .filter((t) => t.score !== null)
        .sort((a, b) => a.score! - b.score!)[0];
      const relatedCriteria = criteria(framework, result.version).filter(
        (c) => c.principle === p.name,
      );
      const relatedAction = priorities.find((action) =>
        relatedCriteria.some((c) => action.criterionIds.includes(c.id)),
      );
      return {
        name: p.name,
        maximum,
        points: p.score === null ? null : Number(p.score.toFixed(2)),
        rating: displayScore(p.score, maximum),
        insight: finding
          ? brief(finding.explanation)
          : (relatedAction?.summary ??
            `${p.coverage} criteria assessed in this review.`),
        excerpt: finding?.evidence[0],
      };
    }),
  };
}
