"use client";
import { useSession } from "./session";
import { ServiceContact } from "./service-contact";
import { reportOffers, serviceMailto, MARCUS_EMAIL } from "@/lib/services";
import { DigitalOffer } from "./report-services";
import { identity } from "@/lib/publication";
import type { Framework } from "@/lib/rubric";
export function ContextualOffers({
  framework,
  reviewId,
}: {
  framework: Framework;
  reviewId?: string;
}) {
  const { user } = useSession();
  const link = {
    reviewId,
    canLinkReview: !!reviewId && !!user?.emailVerified && !user.anonymous,
    source: "review" as const,
  };
  return (
    <section className="pub-human contextual-offers" id="professional-support">
      <div className="pub-person">
        <img src="/brand/marcus-warry.jpg" alt="Marcus Warry ACA" />
        <div>
          <h2>{identity[framework].headline}</h2>
          <p className="pub-invite">{identity[framework].invitation}</p>
          <strong>Marcus Warry ACA</strong>
          <p>
            Co-founder, My Social Impact
            <br />
            Chartered Accountant · Social Impact Consultant
          </p>
          <a href={serviceMailto("discussion")}>{MARCUS_EMAIL}</a>
        </div>
      </div>
      <div className="pub-offers">
        {reportOffers.map((o) => (
          <article key={o.service}>
            <b>{o.price}</b>
            <h3>{o.title}</h3>
            <p>{o.copy}</p>
            {o.service === "improvement" && (
              <>
                <p>Creative and digital support from The Ideas Shed.</p>
                <DigitalOffer />
              </>
            )}
            <ServiceContact {...link} service={o.service}>
              {o.service === "discussion"
                ? "Let’s discuss my report"
                : o.service === "preparation"
                  ? "Let’s make my next report"
                  : o.cta}
            </ServiceContact>
          </article>
        ))}
      </div>
      <div className="pub-ongoing">
        <h3>Someone in your corner. All year round.</h3>
        <p>
          Regular conversations, evidence review and strategic advice. Monthly
          support from £149.
        </p>
        <ServiceContact {...link} service="supported">
          Talk about ongoing support
        </ServiceContact>
      </div>
    </section>
  );
}
