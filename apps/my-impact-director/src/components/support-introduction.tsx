import { supportTiers } from "@/lib/services";
import { ServiceContact } from "./service-contact";
export function SupportIntroduction() {
  return (
    <section
      id="human-support"
      className="support-introduction"
      aria-labelledby="support-title"
    >
      <div className="campaign-width">
        <div className="support-intro-heading">
          <h2 id="support-title">
            SOMEONE IN YOUR CORNER.
            <br />
            <em>All year round.</em>
          </h2>
          <div>
            <p>
              From regular professional check-ins to senior strategic
              involvement, we combine experienced people with the power of AI to
              help you understand your impact, monitor progress and make better
              decisions.
            </p>
            <p>
              <strong>
                AI does the groundwork. People help you move forward.
              </strong>
            </p>
          </div>
        </div>
        <ol
          className="support-preview simple-pricing monthly-pricing"
          aria-label="Indicative ongoing support levels"
        >
          {supportTiers.map((t) => (
            <li
              id={t.id}
              key={t.id}
              className={t.id === "director" ? "director-tier" : ""}
            >
              <details>
                <summary>
                  <span>{t.name}</span>
                  <strong>
                    <small>from </small>
                    {t.price}
                  </strong>
                  <span>/ month</span>
                  <p>{t.summary}</p>
                  <span className="tier-expand">What’s included +</span>
                </summary>
                <div className="tier-description">
                  <p>{t.detail}</p>
                  <ServiceContact service={t.id} source="pricing">
                    Enquire about {t.name}
                  </ServiceContact>
                </div>
              </details>
            </li>
          ))}
        </ol>
        <div className="support-enquiry-line">
          <p className="pricing-qualification">
            Indicative starting prices. Human involvement, meeting frequency,
            deliverables and any board participation are agreed before
            engagement.
          </p>
          <ServiceContact service="human-director" source="pricing">
            Let’s discuss the right level of support
          </ServiceContact>
        </div>
        <div className="ambition-note">
          <strong>THIS IS JUST THE BEGINNING.</strong>
          <p>
            Today: three complementary report reviews. We’re building towards an
            intelligent partner that helps you monitor impact, understand
            evidence and improve throughout the year. The fuller agentic service
            is in development—experienced human support is available now.
          </p>
        </div>
      </div>
    </section>
  );
}
