"use client";
import { useSession } from "./session";
import { ServiceContact } from "./service-contact";
import { reportOffers, type Service } from "@/lib/services";
import type { Framework } from "@/lib/rubric";

export function ContextualOffers({
  framework,
  reviewId,
}: {
  framework: Framework;
  reviewId: string;
}) {
  const { user } = useSession();
  const canLinkReview = !!user && !user.anonymous && !!user.emailVerified;
  const offers =
    framework === "excellence"
      ? [
          {
            service: "discussion" as Service,
            cta: "Free introductory conversation",
            price: "Free",
          },
          {
            service: "supported" as Service,
            cta: "Explore Supported",
            price: "From £149 / month",
          },
          {
            service: "director" as Service,
            cta: "Talk about a human Impact Director",
            price: "From £495 / month",
          },
          {
            service: "consultancy" as Service,
            cta: "Discuss a full Social Impact Excellence assessment",
            price: "Scope and quote agreed together",
          },
        ]
      : reportOffers.filter((o) =>
          (framework === "report"
            ? ["improvement", "digitisation", "preparation"]
            : ["discussion", "improvement", "preparation"]
          ).includes(o.service),
        );
  return (
    <section className="bigger-conversation contextual-offers">
      <p className="eyebrow">AI-POWERED. HUMAN-LED. HELP AVAILABLE NOW.</p>
      <h2>
        {framework === "claims"
          ? "Want to strengthen your impact claims?"
          : framework === "excellence"
            ? "What if someone helped you manage your impact throughout the year?"
            : "Your impact deserves to be brilliantly communicated."}
      </h2>
      <p>
        Start a conversation with Marcus. Starting prices are indicative; scope
        is agreed together. Following a contact link records interest, not a
        received enquiry.
      </p>
      <ul>
        {offers.map((o) => (
          <li key={o.service}>
            <strong>{o.price}</strong>
            <ServiceContact
              service={o.service}
              source="review"
              reviewId={reviewId}
              canLinkReview={canLinkReview}
            >
              {o.cta}
            </ServiceContact>
          </li>
        ))}
      </ul>
      <p className="fine-print">
        Review linking is optional and does not share findings. No obligation,
        no login needed to make contact.
      </p>
    </section>
  );
}
