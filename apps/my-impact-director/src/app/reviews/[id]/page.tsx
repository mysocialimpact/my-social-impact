import { AssessmentCheckoutSandbox } from "@/components/assessment-checkout-sandbox";
import { assessmentStripeConfig } from "@/lib/assessment-stripe";
import { ReviewView } from "@/components/review-view";
export default async function Review({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      <section className="section">
        <ReviewView id={id} />
      </section>
      {assessmentStripeConfig() && (
        <AssessmentCheckoutSandbox key={id} review={id} />
      )}
    </>
  );
}
