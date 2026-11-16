import Image from "next/image";
import Link from "next/link";
import { Arrow } from "./icons";
export function Contact() {
  return (
    <section
      className="human-contact"
      id="contact"
      aria-labelledby="contact-title"
    >
      <div className="campaign-width contact-composition">
        <div className="contact-heading">
          <p className="eyebrow">REAL PEOPLE. SHARED AMBITION.</p>
          <h2 id="contact-title">
            Let’s talk
            <br />
            about your <em>impact.</em>
          </h2>
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
          <figcaption>Marcus Warry · Co-founder, My Social Impact</figcaption>
        </figure>
        <div className="marcus-introduction">
          <h3>Marcus Warry</h3>
          <p className="marcus-role">
            Co-founder, My Social Impact
            <br />
            Chartered Accountant · Social Impact Consultant
          </p>
          <p>
            I’m a Chartered Accountant and social impact consultant. We believe
            social impact should be taken as seriously as financial performance.
          </p>
          <p>
            At My Social Impact, we help organisations understand, manage and
            communicate the difference they make — from credible reporting to
            embedding impact into leadership, strategy and everyday decisions.
          </p>
          <p>
            My Impact Director is part of our ambition to make that expertise
            accessible to many more organisations.
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
              Email Marcus <Arrow diagonal />
            </a>
            <Link href="/services/expert-review#enquire">
              Discuss your impact report <Arrow diagonal />
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
