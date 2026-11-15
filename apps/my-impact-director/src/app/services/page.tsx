import Link from "next/link";
import { PageIntro } from "@/components/shell";
import { services } from "@/lib/services";
import { Arrow } from "@/components/icons";
export default function Services() {
  return (
    <section className="section">
      <PageIntro
        label="Professional support from My Social Impact"
        title="Useful insight. Human expertise."
      >
        <p>
          Use your free review independently, or bring in a professional to help
          you take the next step.
        </p>
      </PageIntro>
      <div className="service-grid">
        {Object.entries(services).map(([slug, s], i) => (
          <Link className="service-card" key={slug} href={"/services/" + slug}>
            <span className="service-index">0{i + 1}</span>
            <h3>{s.name}</h3>
            <p>{s.intro}</p>
            <span className="text-link">
              Explore the service <Arrow />
            </span>
          </Link>
        ))}
      </div>
      <p className="fine-print">
        Every project is scoped through a conversation. No obligation, checkout
        or invented package prices.
      </p>
    </section>
  );
}
