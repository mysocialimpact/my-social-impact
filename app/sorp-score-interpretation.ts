import type { Finding, Lens } from "./sorp-public-model";

export const mandatoryAnswerOrder = ["yes", "mostly", "partly", "limited", "not_yet", "not_sure"] as const;
export type MandatoryAnswer = typeof mandatoryAnswerOrder[number];
export type MandatoryDistribution = Record<MandatoryAnswer, number>;

export const mandatoryAnswerLabels: Record<MandatoryAnswer, string> = {
  yes: "Yes, clearly",
  mostly: "Mostly",
  partly: "Partly",
  limited: "Limited",
  not_yet: "Not yet",
  not_sure: "Not sure",
};

export function mandatoryDistribution(findings: Finding[]): MandatoryDistribution {
  const distribution: MandatoryDistribution = { yes: 0, mostly: 0, partly: 0, limited: 0, not_yet: 0, not_sure: 0 };
  for (const finding of findings) {
    if (!finding.classification.startsWith("MUST") || finding.answer === "not_applicable") continue;
    if (mandatoryAnswerOrder.includes(finding.answer as MandatoryAnswer)) distribution[finding.answer as MandatoryAnswer]++;
  }
  return distribution;
}

export function mandatoryInterpretation(distribution: MandatoryDistribution) {
  const applicable = mandatoryAnswerOrder.reduce((total, answer) => total + distribution[answer], 0);
  if (!applicable) return "No applicable MUST requirements were established for this assessment.";
  const lower = distribution.limited + distribution.not_yet;
  if (distribution.not_sure >= Math.max(distribution.mostly, distribution.partly, lower) && distribution.not_sure >= Math.ceil(applicable / 3)) {
    return "Several mandatory requirements could not be confirmed from the published report. More evidence is needed before their status can be established.";
  }
  if (lower >= Math.max(distribution.mostly, distribution.partly) && lower >= Math.ceil(applicable / 3)) {
    return "Several mandatory requirements still need substantial reporting work before they can be clearly demonstrated.";
  }
  if (distribution.mostly >= Math.max(distribution.partly, lower) && distribution.mostly >= Math.ceil(applicable / 3)) {
    return "Your report already contains much of the information SORP expects. Most of the mandatory requirements are close to being clearly demonstrated, but they need clearer or more explicit reporting before they can be treated as fully evidenced.";
  }
  if (distribution.partly >= Math.max(distribution.mostly, lower) && distribution.partly >= Math.ceil(applicable / 3)) {
    return "Your report contains relevant information across several mandatory requirements, but important elements are still incomplete or unclear.";
  }
  if (distribution.yes > applicable / 2) {
    return "Most applicable mandatory requirements are clearly demonstrated. The remaining requirements still need attention or confirmation before the mandatory picture is complete.";
  }
  return "The mandatory requirements show a mixed position. Some reporting is already in place, while other requirements need clearer evidence, further work or confirmation.";
}

export function historicalSnapshotInterpretation(lens: Lens) {
  const distribution = mandatoryDistribution(lens.findings);
  const applicable = mandatoryAnswerOrder.reduce((total, answer) => total + distribution[answer], 0);
  return {
    distribution,
    applicable,
    clearlyDemonstrated: distribution.yes,
    interpretation: mandatoryInterpretation(distribution),
    reportingStrengthExplanation: "Your Reporting Strength score reflects the quality of the published evidence across the 19 assessment questions. It is not a SORP compliance percentage.",
    distinction: "A strong Reporting Strength score does not override unmet mandatory requirements. Both views matter.",
  };
}
