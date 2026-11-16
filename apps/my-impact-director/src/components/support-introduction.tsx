import Link from "next/link";
import { Arrow } from "./icons";
import { supportTiers } from "@/lib/services";
export function SupportIntroduction() {
  return (
    <section className="support-introduction" aria-labelledby="support-title">
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
                AI helps us do more. Human experience helps us do what matters.
              </strong>
            </p>
            <p>
              Your review is the first step. An experienced professional can get
              to know your organisation, challenge your thinking and help you
              improve throughout the year.
            </p>
            <Link href="/your-impact-director">
              Meet your Impact Director <Arrow diagonal />
            </Link>
          </div>
        </div>
        <ol className="support-preview" aria-label="Indicative support levels">
          {supportTiers.map((tier) => (
            <li
              key={tier.id}
              className={tier.id === "director" ? "director-tier" : ""}
            >
              <Link
                href={
                  tier.id === "free"
                    ? "/#upload"
                    : `/your-impact-director#${tier.id}`
                }
              >
                <span>{tier.name}</span>
                <strong>
                  {tier.id !== "free" && <small>from </small>}
                  {tier.price}
                </strong>
                <span>
                  {tier.id === "free" ? "Free report review" : "/ month"}
                </span>
                <p>{tier.summary}</p>
              </Link>
            </li>
          ))}
        </ol>
        <p className="pricing-qualification">
          Indicative pricing. We’ll agree the right level of involvement for
          your organisation.
        </p>
      </div>
    </section>
  );
}
