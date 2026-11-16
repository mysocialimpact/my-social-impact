import Link from "next/link";
import { supportTiers } from "@/lib/services";
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
            GOOD TECHNOLOGY.
            <br />
            <em>Real people.</em>
          </h2>
          <div>
            <p>
              <strong>
                Your own Impact Director. Without the full-time salary.
              </strong>
            </p>
            <p>
              AI helps us do more. Experienced professionals help you interpret
              evidence, make decisions and monitor progress throughout the year.
            </p>
            <a href="#contact">Talk about ongoing support →</a>
          </div>
        </div>
        <ol
          className="support-preview simple-pricing"
          aria-label="Indicative support levels"
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
                    {t.id !== "free" && <small>from </small>}
                    {t.price}
                  </strong>
                  <span>
                    {t.id === "free" ? "Free report review" : "/ month"}
                  </span>
                  <p>{t.summary}</p>
                  <span className="tier-expand">What’s included +</span>
                </summary>
                <div className="tier-description">
                  <p>{t.detail}</p>
                  <Link
                    href={
                      t.id === "free" ? "/#upload" : `/services/${t.id}#enquire`
                    }
                  >
                    {t.id === "free"
                      ? "Upload a report"
                      : `Enquire about ${t.name}`}{" "}
                    →
                  </Link>
                </div>
              </details>
            </li>
          ))}
        </ol>
        <p className="pricing-qualification">
          Indicative pricing. Human involvement, meetings and deliverables are
          agreed before any engagement.
        </p>
      </div>
    </section>
  );
}
