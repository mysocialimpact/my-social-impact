import type { Framework } from "@/lib/rubric";
export type AssessmentState = {
  id: string;
  framework: Framework;
  status: string;
  has_result: boolean;
  viewed: boolean;
  score: number | null;
  delivery: "pending" | "accepted" | "failed" | null;
};
export type Workspace = {
  id: string;
  root_id: string;
  title: string;
  organisation: string;
  reporting_period: string | null;
  created_at: string;
  expires_at: string;
  can_delete: boolean;
  full: boolean;
  assessments: AssessmentState[];
};
export const stateLabel = (a?: AssessmentState) =>
  !a
    ? "Not started"
    : a.status === "complete" && a.has_result
      ? "Completed"
      : a.status === "failed" || a.status === "complete"
        ? "Needs attention"
        : "Preparing";
export const stateAction = (a?: AssessmentState) =>
  !a
    ? "Start review"
    : stateLabel(a) === "Completed"
      ? "View results"
      : stateLabel(a) === "Needs attention"
        ? "Resolve issue"
        : "View progress";
