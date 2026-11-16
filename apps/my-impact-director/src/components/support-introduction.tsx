import { supportTiers } from "@/lib/services";
import { ServiceContact } from "./service-contact";
export function SupportIntroduction() {
  return (
    <section
      id="human-support"
      className="support-introduction chapter-support"
      aria-labelledby="support-title"
    >
      <div className="campaign-width">
        <p className="chapter-label">04 / A RELATIONSHIP, NOT JUST A REPORT</p>
        <div className="support-intro-heading" data-reveal>
          <h2 id="support-title">
            SOMEONE IN YOUR CORNER.
            <br />
            <em>All year round.</em>
          </h2>
          <div>
            <p>
              Experienced social impact professionals who get to know your
              organisation, check in regularly and help you make better
              decisions — with AI working behind the scenes.
            </p>
            <p>
              <strong>
                Human judgement, challenge and strategic understanding.
                Technology that makes the groundwork more affordable.
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
            Let’s talk about ongoing support
          </ServiceContact>
        </div>
      </div>
    </section>
  );
}
