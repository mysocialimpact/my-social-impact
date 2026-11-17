import {
  REPORT_VERSION,
  isReportV2,
  reportRubricFor,
} from "./report-methodology";
export const VERSION = "1.0.0";
export const COVERAGE = { minimumPerPrinciple: 3, minimumTotal: 16 } as const;
export const ANCHORS = [
  "Not demonstrated in the report",
  "Mentioned, with little supporting substance",
  "Partially demonstrated, with material gaps",
  "Clearly and reasonably demonstrated",
  "Strongly demonstrated, with convincing supporting evidence",
];
export const LIMITATION =
  "An automated review of this report, not independent verification, certification, professional assurance or a judgement of undisclosed organisational practice. Evidence not disclosed here may exist elsewhere.";
export type Framework = "claims" | "excellence" | "report";
export const frameworkNames = {
  claims: "Social Impact Claims Code",
  excellence: "Social Impact Excellence",
  report: "The Impact Edit",
};
export const rubrics = {
  report: [
    [
      "Clarity",
      "C1 · Plain English",
      "C2 · Structure and Organisation",
      "C3 · Navigation",
      "C4 · Information Hierarchy",
      "C5 · Cognitive Readability",
    ],
    [
      "Storytelling",
      "S1 · Narrative Structure",
      "S2 · Human Stories",
      "S3 · Meaningful Case Studies",
      "S4 · Emotional Connection",
      "S5 · Narrative Coherence",
    ],
    [
      "Design",
      "D1 · Typography",
      "D2 · Layout and Composition",
      "D3 · Colour and Visual Identity",
      "D4 · Photography, Illustration and Art Direction",
      "D5 · Overall Design Quality",
    ],
    [
      "Engagement",
      "E1 · First Impression",
      "E2 · Pacing and Variety",
      "E3 · Visual Engagement",
      "E4 · Audience Connection",
      "E5 · Sustained Interest and Participation",
    ],
    [
      "Communication",
      "M1 · Key Messages",
      "M2 · Data Communication",
      "M3 · Tone and Voice",
      "M4 · Conclusions and Takeaways",
      "M5 · Communication Effectiveness",
    ],
  ],

  claims: [
    [
      "Evidence",
      "Does the report distinguish activities, outputs, outcomes and impact?",
      "Are important claims supported by relevant evidence?",
      "Are evidence sources and methods credible and appropriate?",
      "Are claims about contribution or causation adequately supported?",
    ],
    [
      "Proportion",
      "Does the strength of each material claim match the evidence presented?",
      "Are conclusions appropriately qualified?",
      "Are contribution and causation distinguished?",
      "Is the evidential burden proportionate to the importance and nature of the claim?",
    ],
    [
      "Transparency",
      "Can important claims be traced to their evidence?",
      "Are relevant data sources and methods sufficiently explained?",
      "Are important assumptions and definitions disclosed?",
      "Are methodological limitations and uncertainty acknowledged?",
    ],
    [
      "Balance",
      "Are challenges, limitations or unsuccessful outcomes discussed?",
      "Are relevant differences in stakeholder experience represented?",
      "Are unintended consequences or potentially negative outcomes considered?",
      "Is the overall account fair, rather than selectively positive?",
    ],
    [
      "Learning",
      "Are lessons from the organisation’s work identified?",
      "Is there evidence that findings inform decisions?",
      "Are practical improvement actions explained?",
      "Does the report demonstrate follow-up on previous learning where appropriate?",
    ],
  ],
  excellence: [
    [
      "Purpose",
      "Is the organisation’s social or environmental purpose clear?",
      "Are intended beneficiaries and desired changes identified?",
      "Is there a theory of change or equivalent explanation of how activities create outcomes?",
      "Is purpose connected to organisational strategy?",
    ],
    [
      "Leadership",
      "Is responsibility and accountability for impact demonstrated?",
      "Is board or senior leadership engagement evidenced?",
      "Does impact information appear to influence decisions?",
      "Are stakeholders meaningfully involved in oversight, learning or accountability?",
    ],
    [
      "Data",
      "Are meaningful outcomes measured?",
      "Are indicators appropriate to the intended changes?",
      "Are data collection and analysis sufficiently credible?",
      "Is evidence used to understand results rather than merely describe activity?",
    ],
    [
      "Delivery",
      "Are activities and interventions connected to intended outcomes?",
      "Are reach, activity and performance explained?",
      "Is there evidence of meaningful outcomes being achieved?",
      "Is there evidence of adaptation and improvement in delivery?",
    ],
    [
      "Communications",
      "Is the report clear, understandable and accessible?",
      "Does it communicate impact compellingly and accurately?",
      "Are data, evidence and findings presented usefully?",
      "Is the report balanced, transparent and relevant to intended audiences?",
    ],
  ],
} as const;
export function criteria(
  framework: Framework,
  version = framework === "report" ? REPORT_VERSION : VERSION,
) {
  const rubric =
    framework === "report" && isReportV2(version)
      ? reportRubricFor(version)
      : rubrics[framework];
  return rubric.flatMap(([principle, ...tests], p) =>
    tests.map((question, t) => ({
      id: `${framework}.${p + 1}.${t + 1}`,
      principle,
      question,
    })),
  );
}

export const FRAMEWORKS: Framework[] = ["claims", "excellence", "report"];
export const frameworkLogos = {
  claims: "/brand/claims-code.png",
  excellence: "/brand/excellence.png",
  report: "/brand/the-impact-edit.svg",
};
export const testsPerPillar = (framework: Framework) =>
  framework === "report" ? 5 : 4;
export const reportAnchors = [
  "Not demonstrated or seriously ineffective",
  "Weak — substantial improvements required",
  "Developing — partially effective with clear shortcomings",
  "Good — effective with opportunities to improve",
  "Excellent — highly effective and appropriate to purpose",
];
