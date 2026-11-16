import { REPORT_VERSION, isReportV2 } from "./report-methodology";
export const EDIT_ATTRIBUTION =
  "An Impact Report Excellence assessment developed by My Social Impact.";
export const EDIT_CAVEAT =
  "This AI-assisted editorial review examines readability, storytelling, design, engagement and communication. Creative judgements are partly subjective, and different readers may respond differently.";

export function editCaveat(version = REPORT_VERSION) {
  return isReportV2(version)
    ? "This AI-assisted editorial review examines readability and hierarchy, storytelling, visual design, data communication and accessibility. Creative judgements are partly subjective. Structural PDF checks are not a screen-reader or user accessibility audit."
    : EDIT_CAVEAT;
}
