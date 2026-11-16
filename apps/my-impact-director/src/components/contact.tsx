import Image from "next/image";
import { contactContext, serviceMailto, type Service } from "@/lib/services";
import { ServiceContact, CopyMarcusEmail } from "./service-contact";
export function Contact({
  standalone = false,
  service = "discussion",
}: {
  standalone?: boolean;
  service?: Service;
}) {
  const Heading = standalone ? "h1" : "h2";
  return (
    <section
      className={
        "human-contact purpose-contact" +
        (standalone ? " standalone-contact" : "")
      }
      id="contact"
      aria-labelledby="contact-title"
    >
      <div className="campaign-width purpose-composition">
        <div className="purpose-heading" data-reveal>
          <p className="chapter-label">
            {standalone
              ? "A REAL PERSON. A USEFUL CONVERSATION."
              : "05 / OUR PURPOSE. OUR PEOPLE."}
          </p>
          <Heading id="contact-title">
            {standalone ? (
              <>
                Let’s talk about <em>your impact.</em>
              </>
            ) : (
              <>
                Imagine a world where social impact was taken as seriously as{" "}
                <em>financial performance.</em>
              </>
            )}
          </Heading>
          {standalone ? (
            <p className="contact-context">
              You’d like to: <strong>{contactContext(service)}</strong>
            </p>
          ) : (
            <p>
              That’s the ambition behind My Social Impact. We’re building
              towards an intelligent Impact Director to help you throughout the
              year. The full agentic service is developing. The people are here
              now.
            </p>
          )}
        </div>
        <figure className="marcus-portrait">
          <Image
            src="/brand/marcus-warry.jpg"
            width={1122}
            height={1402}
            alt="Marcus Warry, co-founder of My Social Impact"
            sizes="(max-width: 700px) 90vw, 32vw"
          />
          <figcaption>
            Marcus Warry ACA · Co-founder, My Social Impact
          </figcaption>
        </figure>
        <div className="marcus-introduction">
          <h3>Marcus Warry ACA</h3>
          <p className="marcus-role">
            Co-founder, My Social Impact
            <br />
            Chartered Accountant · Social Impact Consultant
          </p>
          <p>
            A real person to talk things through with. No account needed. No
            obligation.
          </p>
          <a className="contact-address" href={serviceMailto(service)}>
            marcus@mysocialimpact.org
          </a>
          <div className="contact-actions">
            <ServiceContact
              service={service}
              source="contact"
              className="button primary"
            >
              Email Marcus
            </ServiceContact>
            <CopyMarcusEmail />
          </div>
          <p className="fine-print">
            Your email app opens. Nothing is sent until you send it.
          </p>
          <p className="contact-locations">Somerset · London · Kampala</p>
        </div>
      </div>
    </section>
  );
}
