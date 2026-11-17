/** Methodology v2.0 revision 2.0.1. Released 2.0.0 remains immutable. */
import * as legacy from "./report-methodology-2-0-0";
export const REPORT_VERSION = "2.0.1";
export const isReportV2 = legacy.isReportV2;
export const isRevisedReport = (version = REPORT_VERSION) =>
  /^2\./.test(version) && !/^2\.0\.0(?:-|$)/.test(version);
export const reportWeights = [25, 30, 25, 10, 10] as const;
export const reportPillars = [
  "Readability & Copy",
  "Information Hierarchy",
  "Visual Design",
  "Storytelling",
  "Data Presentation",
] as const;
export const reportV2Anchors = [
  "Seriously ineffective",
  "Weak",
  "Adequate or developing",
  "Genuinely good",
  "Excellent execution",
] as const;
export const validateReportAnchorReason = legacy.validateReportAnchorReason;
// Evidence requirements and observable execution ladders, never report identities.
const definitions = [
  [
    "R1",
    "Clarity and simplicity",
    "Source wording and rendered body copy; respect necessary technical language for the intended audience.",
    "Meaning is obscured",
    "Jargon or complexity repeatedly obstructs meaning",
    "Understandable with avoidable complexity",
    "Clear, precise language explains necessary complexity",
    "Exceptionally direct, engaging precision makes demanding ideas effortless",
  ],
  [
    "R2",
    "Sentences and paragraphs",
    "Inspect opening, longest passages and typical body pages; quote representative source wording.",
    "Sentence and paragraph construction prevents comprehension",
    "Repeated long sentences or blocks overwhelm readers",
    "Usable lengths with local strain",
    "Well-paced sentences and manageable paragraphs support comprehension",
    "Exceptionally controlled rhythm explains complexity with ease",
  ],
  [
    "R3",
    "Editing and repetition",
    "Compare recurring passages across the report; distinguish useful reinforcement from redundant copy.",
    "Redundancy buries the purpose",
    "Substantial duplication or digression obscures useful material",
    "Some avoidable repetition remains",
    "Purposeful editing removes repetition without losing meaning",
    "Every passage earns its place; exceptional economy without oversimplifying",
  ],
  [
    "R4",
    "Text density and reading effort",
    "Rendered ordinary-size and enlarged dense and typical pages, text metrics and word load; no automatic penalty for length.",
    "Text load makes ordinary reading unusable",
    "Dense blocks and sustained effort overwhelm the message",
    "Readable but demanding passages need relief",
    "Proportionate copy and breathing space sustain comfortable reading",
    "Exceptional control of copy load makes demanding sections inviting",
  ],
  [
    "R5",
    "Getting to the point",
    "Opening and section introductions plus substantive passages; consider what could be cut without losing meaning.",
    "Useful meaning is persistently inaccessible",
    "Long lead-ins or unnecessary copy repeatedly delay the point",
    "The point emerges with avoidable effort",
    "Writing reaches the point promptly and explains just enough",
    "Unusually economical copy communicates rich meaning immediately",
  ],
  [
    "H1",
    "Main findings first",
    "Cover, opening, summaries and outcome pages; record where achievements and caveats become apparent.",
    "Main findings are hidden or confused",
    "Background dominates and readers hunt for conclusions",
    "Findings are findable but compete with background",
    "Important outcomes and conclusions are immediately prominent",
    "An exceptional opening reveals meaning, scale and limitations at a glance",
  ],
  [
    "H2",
    "Logical architecture",
    "Whole-document sequence and section relationships; distinguish appropriate length from poor organisation.",
    "No coherent route through the material",
    "Disconnected or repetitive sections make readers assemble the logic",
    "Broadly logical with awkward joins",
    "A purposeful sequence moves from purpose to findings and next steps",
    "Exceptional architecture serves quick and deep reading alike",
  ],
  [
    "H3",
    "Headings, summaries and emphasis",
    "Compare specificity and usefulness with important content; do not reward the presence of headings.",
    "Emphasis misdirects readers",
    "Generic headings or competing emphasis obscure meaning",
    "Useful signposting with weak prioritisation",
    "Specific headings and summaries consistently prioritise meaning",
    "An exceptionally clear hierarchy makes complex material instantly navigable",
  ],
  [
    "H4",
    "Skimming and navigation",
    "AI-simulated scan for purpose, achievements, difference, challenges and next steps; physical pages and ease required.",
    "Essential answers cannot be located",
    "Laborious searching defeats a useful brief scan",
    "A scan finds answers with avoidable effort",
    "Readers quickly locate answers and return to detail",
    "An effortless scan reveals the whole account without losing nuance",
  ],
  [
    "H5",
    "Breaking down complexity",
    "Demanding sections, grouping and chunking; do not score sentence length again here.",
    "Organisation makes complex material unusable",
    "Undifferentiated sections overload readers",
    "Manageable groups with some weakly ordered sections",
    "Intelligent chunks and summaries make complexity understandable",
    "Exceptional grouping supports both orientation and detailed understanding",
  ],
] as const;
const reused = (prefix: string) =>
  legacy.reportV2Criteria.filter((c) => c.code.startsWith(prefix));
const first = definitions.map(([code, title, evidence, ...anchors]) => ({
  code,
  title,
  question: `${code} · ${title}`,
  evidence,
  anchors: anchors.map((a, i) => `${i} = ${reportV2Anchors[i]}: ${a}`),
}));
export const reportV2Criteria = [
  ...first,
  ...reused("V"),
  ...reused("S"),
  ...reused("D"),
].map((c, i) => ({
  ...c,
  id: `report.${Math.floor(i / 5) + 1}.${(i % 5) + 1}`,
  principle: reportPillars[Math.floor(i / 5)],
  evidence:
    "evidence" in c
      ? c.evidence
      : "Inspect actual rendered typical and targeted pages and relevant source passages. Cite execution, consequence and physical page; presence earns no credit.",
}));
export const reportV2Rubric = reportPillars.map((p, i) => [
  p,
  ...reportV2Criteria.slice(i * 5, i * 5 + 5).map((c) => c.question),
]);
export const reportCriteriaFor = (version = REPORT_VERSION) =>
  isRevisedReport(version) ? reportV2Criteria : legacy.reportV2Criteria;
export const reportRubricFor = (version = REPORT_VERSION) =>
  isRevisedReport(version) ? reportV2Rubric : legacy.reportV2Rubric;
export const reportWeightsFor = (version = REPORT_VERSION) =>
  isRevisedReport(version) ? reportWeights : legacy.reportWeights;
export const REPORT_SCORING =
  "Each applicable criterion scores 0–4 against execution anchors. Pillar contribution = weight × sum(scores) ÷ (4 × assessable criteria). Weights: Readability & Copy 25; Information Hierarchy 30; Visual Design 25; Storytelling 10; Data Presentation 10. At least four criteria in every pillar and 22 overall must be assessable. Unassessable and genuinely inapplicable criteria are disclosed, never given invented scores. Missing required visual coverage or unresolved editorial inconsistency withholds the overall score. The total uses unrounded contributions. 0–39 Poor; 40–59 Significant improvement needed; 60–74 Adequate, with important weaknesses; 75–89 Strong professional communication; 90–100 Exceptional. This revised assessment is beta, not independently validated professional judgement.";
export const pillarMaximum = legacy.pillarMaximum;
