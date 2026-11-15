import { PageIntro } from "@/components/shell";
import { Intake } from "@/components/intake";
import { ready } from "@/lib/reviews";
export const dynamic = "force-dynamic";
export default function Review() {
  return (
    <section className="section narrow">
      <PageIntro
        label="Your free impact report review"
        title="Let’s look at the evidence."
      >
        <p>
          Share a report. Get two thoughtful assessments and a clear place to
          start improving.
        </p>
      </PageIntro>
      <Intake enabled={ready()} />
    </section>
  );
}
