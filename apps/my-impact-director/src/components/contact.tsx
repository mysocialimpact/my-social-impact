import Image from "next/image";
import Link from "next/link";
import { Arrow } from "./icons";
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
            I’m a Chartered Accountant and co-founder of My Social Impact. I
            help organisations turn good intentions into meaningful results. I
            believe social impact should be taken as seriously as financial
            performance.
          </p>
          <p>
            Sometimes you need a report, better evidence or a clearer strategy.
            Sometimes you need someone experienced to talk things through with
            regularly, keep you focused and help you make progress.
          </p>
          <p>
            My Impact Director combines human judgement with intelligent
            technology to make that support more affordable. I’m one of the
            experienced My Social Impact professionals you can talk to; we’ll
            agree who is best placed to support you and how.
          </p>
          <a
            className="contact-address"
            href="mailto:marcus@mysocialimpact.org"
          >
            marcus@mysocialimpact.org
          </a>
          <div className="contact-actions">
            <a
              className="button primary"
              href="mailto:marcus@mysocialimpact.org?subject=Let%E2%80%99s%20talk%20about%20impact"
            >
              Talk to Marcus <Arrow diagonal />
            </a>
            <Link href="/your-impact-director#enquire">
              Find your level of support <Arrow diagonal />
            </Link>
          </div>
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
