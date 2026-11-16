import {
  reportOffers,
  IDEAS_SHED_PROJECT,
  novemberOfferActive,
} from "@/lib/services";
import { ServiceContact } from "./service-contact";

export function DigitalOffer() {
  if (!novemberOfferActive())
    return (
      <p className="offer-terms">
        <a href={IDEAS_SHED_PROJECT}>
          Check The Ideas Shed’s current project offers →
        </a>
      </p>
    );
  return (
    <details className="digital-offer">
      <summary>
        Eligible charity, social enterprise or B Corp? £250 starter ↗
      </summary>
      <p>
        50% off the standard £500 agreed day project through 30 November 2026.
        Eligibility and code availability apply; charity, B Corp and
        social-enterprise places are limited to three per category each week,
        released Sundays at noon UK time. Offers cannot be combined. Scope must
        be agreed; larger work is quoted separately.
      </p>
      <a href={IDEAS_SHED_PROJECT}>
        Check live eligibility, availability and terms at The Ideas Shed →
      </a>
    </details>
  );
}
export function ReportServices() {
  return (
    <section
      id="report-services"
      className="report-services"
      aria-labelledby="report-services-title"
    >
      <div className="campaign-width">
        <div className="report-services-heading">
          <h2 id="report-services-title">
            YOUR REPORT IS
            <br />
            <em>JUST THE BEGINNING.</em>
          </h2>
          <p>
            We’ve helped you review it.
            <br />
            What shall we do next?
          </p>
        </div>
        <ol className="report-offers">
          {reportOffers.map((offer, i) => (
            <li key={offer.service}>
              <span className="offer-number">0{i + 1}</span>
              <div>
                <h3>{offer.title}</h3>
                <p>{offer.copy}</p>
                {offer.service === "digitisation" && <DigitalOffer />}
              </div>
              <div className="offer-action">
                <strong>{offer.price}</strong>
                <ServiceContact service={offer.service}>
                  {offer.cta}
                </ServiceContact>
              </div>
            </li>
          ))}
        </ol>
        <p className="offer-terms">
          One-off projects. Indicative starting prices, with scope and price
          agreed before work starts. Email Marcus directly—no login or lengthy
          form.
        </p>
      </div>
    </section>
  );
}
