import Image from "next/image";
import { ServiceContact, CopyMarcusEmail } from "./service-contact";
export function Contact({ standalone = false }: { standalone?: boolean }) {
  const Heading = standalone ? "h1" : "h2";
  return (
    <section
      className="human-contact"
      id="contact"
      aria-labelledby="contact-title"
    >
      <div className="campaign-width contact-composition">
        <div className="contact-heading">
          <p className="eyebrow">REAL PEOPLE. SHARED AMBITION.</p>
          <Heading id="contact-title">
            Let’s talk
            <br />
            about your <em>impact.</em>
          </Heading>
          <p>
            Whether you’d like to discuss your report, strengthen your impact
            management or explore what we could do together, we’d love to hear
            from you.
          </p>
        </div>
        <figure className="marcus-portrait">
          <Image
            src="/brand/marcus-warry.jpg"
            width={1122}
            height={1402}
            alt="Marcus Warry, co-founder of My Social Impact"
            sizes="(max-width: 700px) 100vw, 42vw"
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
            {standalone
              ? "Let’s talk about your report, your impact management or the support your organisation needs. An experienced human perspective can help you turn evidence into useful next steps."
              : "A real person to talk things through with. Get in touch about your report or ongoing impact support."}
          </p>
          <a
            className="contact-address"
            href="mailto:marcus@mysocialimpact.org"
          >
            marcus@mysocialimpact.org
          </a>
          <div className="contact-actions">
            <ServiceContact
              service="discussion"
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
          <p className="contact-locations">
            Somerset · London · Kampala
            <br />
            <span>Places we work. One shared ambition.</span>
          </p>
        </div>
      </div>
    </section>
  );
}
