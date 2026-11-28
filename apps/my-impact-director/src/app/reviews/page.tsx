import { SavedReviews } from "@/components/saved-reviews";
import { AssessmentProjectCredits } from "@/components/assessment-project-credits";
import { assessmentStripeConfig } from "@/lib/assessment-stripe";

export default function Reviews() {
  return (
    <>
      <SavedReviews />
      {assessmentStripeConfig() && <AssessmentProjectCredits />}
    </>
  );
}
