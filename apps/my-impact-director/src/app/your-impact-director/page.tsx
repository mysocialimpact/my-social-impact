import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Enquiry } from "@/components/enquiry";
import { Arrow } from "@/components/icons";
import { services, supportTiers, type Service } from "@/lib/services";
export const metadata: Metadata = {
  title: "Your Impact Director — Human-led. AI-powered.",
  description:
    "Your own Impact Director. Without the full-time salary. Explore indicative support from £49 a month, human review from £149 and a hands-on Director from £495.",
};
export default async function YourImpactDirector({
  searchParams,
}: {
  searchParams: Promise<{ review?: string; interest?: string }>;
}) {
  const params = await searchParams;
  const review =
    params.review &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
      params.review,
    )
      ? params.review
      : null;
  const interest: Service =
    params.interest && Object.hasOwn(services, params.interest)
      ? (params.interest as Service)
      : "human-director";
  const enquire = (service: Service) =>
    `/your-impact-director?interest=${service}${review ? `&review=${review}` : ""}#enquire`;
  return (
    <div className="support-page">
      <section
        id="introduction"
        className="support-hero campaign-width"
        aria-labelledby="support-heading"
      >
        <div>
          <p className="eyebrow">HUMAN-LED. AI-POWERED.</p>
          <h1 id="support-heading">
            YOUR OWN
            <br />
            IMPACT DIRECTOR.
            <br />
            <em>
              Without the
              <br />
              full-time salary.
            </em>
          </h1>
          <p className="support-lead">
            A real person in your corner.
            <br />
            Powerful AI behind the scenes.
          </p>
          <p>
            Experienced professionals. The Social Impact Excellence methodology.
            Practical support to help your organisation keep improving.
          </p>
          <div className="support-hero-actions">
            <a className="button primary" href="#support-pricing">
              Find your level of support <Arrow />
            </a>
            <a href="#enquire">
              Let’s talk <Arrow diagonal />
            </a>
          </div>
          <p className="support-first-step">
            New here?{" "}
            <Link href="/#upload">Start with your free report review →</Link>
          </p>
        </div>
        <figure className="support-portrait">
          <Image
            src="/brand/marcus-warry.jpg"
            width={1122}
            height={1402}
            alt="Marcus Warry, one of the experienced professionals at My Social Impact"
            sizes="(max-width: 700px) 100vw, 42vw"
            priority
          />
          <figcaption>
            <strong>Marcus Warry ACA</strong>
            <span>Co-founder, My Social Impact</span>
            <span>Chartered Accountant · Social Impact Consultant</span>
            <Link href="/#contact">
              Meet Marcus <Arrow diagonal />
            </Link>
          </figcaption>
        </figure>
      </section>
      <section
        id="human-support"
        className="someone-section"
        aria-labelledby="someone-title"
      >
        <div className="campaign-width someone-grid">
          <div>
            <p className="eyebrow">AN AFFORDABLE MEMBER OF THE SENIOR TEAM.</p>
            <h2 id="someone-title">
              SOMEONE
              <br />
              IN YOUR <em>corner.</em>
            </h2>
          </div>
          <div>
            <p className="support-lead">
              Someone who understands your purpose. Who asks the awkward
              questions. Who helps you keep moving forward.
            </p>
            <p>
              With human-supported services, a real professional gets to know
              your organisation, reviews your evidence and helps you turn
              priorities into progress. Regular conversations and practical
              strategic advice can support management decisions, funding
              discussions and reporting.
            </p>
            <p>
              We’ll agree the right rhythm and scope together, including any
              preparation for board meetings or specialist input. Marcus and
              other experienced My Social Impact professionals may provide
              support; personal involvement depends on your agreed service.
            </p>
          </div>
        </div>
      </section>
      <section
        className="support-pricing campaign-width"
        id="support-pricing"
        aria-labelledby="pricing-title"
      >
        <p className="eyebrow">
          FROM YOUR FIRST REVIEW TO AN ONGOING RELATIONSHIP.
        </p>
        <h2 id="pricing-title">
          REAL EXPERTISE.
          <br />
          <em>Without the full-time cost.</em>
        </h2>
        <p className="pricing-qualification">
          Indicative pricing. We’ll agree the right level of involvement for
          your organisation.
        </p>
        <div className="pricing-rows">
          {supportTiers.map((tier, index) => (
            <article
              id={tier.id}
              key={tier.id}
              className={`pricing-row ${tier.id === "director" ? "director-tier" : ""}`}
            >
              <div className="tier-name">
                <span aria-hidden="true">0{index + 1}</span>
                <h3>{tier.name}</h3>
                <p>{tier.summary}</p>
              </div>
              <p className="tier-price">
                {tier.id !== "free" && <span>from</span>}
                <strong>{tier.price}</strong>
                <span>
                  {tier.id === "free" ? "Your first review" : "per month"}
                </span>
              </p>
              <p className="tier-detail">{tier.detail}</p>
              <Link
                className="tier-action"
                href={tier.id === "free" ? "/#upload" : enquire(tier.id)}
              >
                {" "}
                {tier.id === "free"
                  ? "Review for free"
                  : `Explore ${tier.name}`}{" "}
                <Arrow diagonal />
              </Link>
            </article>
          ))}
        </div>
        <div className="pricing-terms">
          <p>
            These are starting prices from our original concept, not final
            contractual offers. Meetings, their frequency and duration,
            deliverables, board involvement and the level of human support will
            be agreed before any engagement.
          </p>
          <a href="#enquire">
            Let’s talk about the right level of support <Arrow diagonal />
          </a>
        </div>
      </section>
      <section
        id="ai"
        className="ai-support"
        aria-labelledby="ai-support-title"
      >
        <div className="campaign-width">
          <h2 id="ai-support-title">
            AI DOES THE HEAVY LIFTING.
            <br />
            <em>People help you make the right decisions.</em>
          </h2>
          <div className="ai-support-columns">
            <div>
              <p className="eyebrow">WORKING TODAY</p>
              <h3>Your first report review.</h3>
              <p>
                Upload a PDF and choose the Social Impact Claims Code or Social
                Impact Excellence review. Explore evidence-based findings,
                practical recommendations and the learning journeys. Confirm
                your email to receive and keep your full reports.
              </p>
              <Link href="/#upload">
                Review your report — free <Arrow diagonal />
              </Link>
            </div>
            <div>
              <p className="eyebrow">DEVELOPING WITH THE SERVICE</p>
              <h3>More capacity. More useful insight.</h3>
              <p>
                Our ambition is for AI tools and agents to help research
                evidence, monitor indicators, analyse trends, prepare management
                information and reduce reporting and administration. These
                ongoing capabilities are being developed; they are not all
                operational or included automatically in a tier.
              </p>
            </div>
          </div>
        </div>
      </section>
      <section
        className="advisory-section campaign-width"
        id="ai-readiness"
        aria-labelledby="readiness-title"
      >
        <div>
          <p className="eyebrow">ANOTHER WAY TO HELP YOU MAKE PROGRESS.</p>
          <h2 id="readiness-title">
            HOW AI READY IS
            <br />
            <em>your organisation?</em>
          </h2>
          <p>
            What if the technology helping us understand your impact could also
            help your organisation work smarter?
          </p>
          <p>
            As part of our broader advisory approach, we can explore your AI
            readiness: your information, productivity, analysis, reporting and
            internal workflows. Practical opportunities. Better decisions. More
            time for the work that matters.
          </p>
          <p className="fine-print">
            Impact management remains at the heart of the service. AI readiness
            advice is scoped separately; no formal diagnostic is automatically
            included in a tier.
          </p>
          <Link href={enquire("ai-readiness")}>
            Talk to us about AI readiness <Arrow diagonal />
          </Link>
          <p className="readiness-extra">
            Prefer a first look?{" "}
            <a href="https://www.theideasshed.com/ai-ready">
              Try The Ideas Shed’s free AI Readiness Check <Arrow diagonal />
            </a>
            . It’s a separate, optional starting point for a conversation.
          </p>
        </div>
        <aside>
          <h3>
            Wider expertise.
            <br />
            The same purpose.
          </h3>
          <p>
            My Social Impact is a boutique professional consultancy. Our work
            connects strategy and organisational purpose with measurement,
            evaluation, leadership, data and impact communications.
          </p>
          <p>
            Practical AI adoption, digital innovation and systems thinking can
            help your organisation put those ideas to work.
          </p>
          <Link href={enquire("consultancy")}>
            Discuss a wider challenge <Arrow diagonal />
          </Link>
          <p>
            <Link
              href={`/services/preparation${review ? `?review=${review}` : ""}`}
            >
              Report preparation
            </Link>{" "}
            ·{" "}
            <Link
              href={`/services/digitisation${review ? `?review=${review}` : ""}`}
            >
              Report digitisation
            </Link>
          </p>
        </aside>
      </section>
      <div className="campaign-width support-enquiry">
        <Enquiry
          key={`${interest}:${review}`}
          service={interest}
          reviewId={review}
          chooseService
        />
        <p className="support-contact-line">
          Prefer a personal introduction?{" "}
          <a href="mailto:marcus@mysocialimpact.org?subject=My%20Impact%20Director%20support">
            Talk to Marcus
          </a>{" "}
          · Somerset · London · Kampala
        </p>
      </div>
    </div>
  );
}
