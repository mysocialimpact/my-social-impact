import { PageIntro } from "@/components/shell";
import { ServiceStories } from "@/components/service-stories";
export default function Services() {
  return (
    <section className="section">
      <PageIntro
        label="PROFESSIONAL SUPPORT FROM MY SOCIAL IMPACT"
        title="Insight is just the beginning."
      >
        <p>
          Experienced people. Better questions. Practical help to understand
          your impact and tell its story with confidence.
        </p>
      </PageIntro>
      <ServiceStories />
      <p className="fine-print">
        Every project starts with a conversation about what your organisation
        needs.
      </p>
    </section>
  );
}
