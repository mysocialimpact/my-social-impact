import {
  REPORT_VERSION,
  isReportV2,
  isRevisedReport,
} from "./report-methodology";
export const EDIT_ATTRIBUTION =
  "An Impact Report Excellence assessment developed by My Social Impact.";
export const EDIT_CAVEAT =
  "This AI-assisted editorial review examines readability, storytelling, design, engagement and communication. Creative judgements are partly subjective, and different readers may respond differently.";

export function editCaveat(version = REPORT_VERSION) {
  return isRevisedReport(version)
    ? "This beta AI-assisted editorial review examines Readability & Copy, Information Hierarchy, Visual Design, Storytelling and Data Presentation. Creative judgements are partly subjective. The overall score is calculated from the weighted criteria when inspection, coverage and consistency checks pass. Scores are indicative creative judgements. Independent human calibration and technical PDF accessibility compliance are not claimed."
    : isReportV2(version)
      ? "This AI-assisted editorial review examines readability and hierarchy, storytelling, visual design, data communication and accessibility. Creative judgements are partly subjective. Structural PDF checks are not a screen-reader or user accessibility audit."
      : EDIT_CAVEAT;
}
