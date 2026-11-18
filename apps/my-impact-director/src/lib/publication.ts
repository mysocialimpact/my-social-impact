import {
  pillarSummary,
  validPillarSummary,
  suppliedPillarSummary,
} from "./pillar-summary";
import { reportTotal } from "./report-total";
import type { ReviewResult } from "./pipeline";
import { type Framework } from "./rubric";
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
export const scoreColours = [
  "#a51c30",
  "#bc2834",
  "#c44227",
  "#bb521b",
  "#a36509",
  "#8b750c",
  "#6a7e16",
  "#477f24",
  "#247c3c",
  "#087443",
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
  const index = Math.min(9, Math.floor(percent / 10));
  return { percent, label: bands[index], colour: scoreColours[index] };
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
    logo: "impact-design-review-transparent.png",
    colour: "#071126",
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
      framework === "report"
        ? displayScore(reportTotal(result))
        : score.provisional
          ? null
          : displayScore(score.unroundedOverall ?? score.overall),
    withheld:
      framework === "report" && result.publicationNotice
        ? "Overall score unavailable"
        : "Insufficient evidence to score",
    verdict:
      framework === "report"
        ? result.artDirector?.review.firstImpression ||
          result.visualFirstImpression ||
          brief(result.editorial?.verdict || result.actions.summary)
        : brief(result.editorial?.verdict || result.actions.summary),
    priorities,
    pillars: score.principles.map((p) => {
      const maximum = pillarMaximum(p);
      const finding = p.tests
        .filter((t) => t.score !== null)
        .sort((a, b) => a.score! - b.score!)[0];
      const supplied = suppliedPillarSummary(
        p.name,
        p.tests,
        result.actions.pillarSummaries,
      );
      const summary =
        supplied ??
        (validPillarSummary(p.summary) ? p.summary! : pillarSummary(p.tests));
      return {
        name: p.name,
        maximum,
        points: p.score === null ? null : Number(p.score.toFixed(2)),
        rating: displayScore(p.score, maximum),
        insight: summary.text,
        insightPages: summary.pages,
        insightLimitation: summary.limitation,
        excerpt: finding?.evidence[0],
      };
    }),
  };
}
