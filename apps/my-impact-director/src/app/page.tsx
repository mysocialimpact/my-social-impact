import { Contact } from "@/components/contact";
import { Arrow } from "@/components/icons";
import Link from "next/link";
import Image from "next/image";
import { Intake, UploadShortcut } from "@/components/intake";
import { SupportIntroduction } from "@/components/support-introduction";
import { ready } from "@/lib/reviews";
export const dynamic = "force-dynamic";
export default function Home() {
  return (
    <div className="campaign">
      <section
        id="introduction"
        className="director-opening"
        aria-labelledby="director-title"
      >
        <div className="director-identity">
          <h1 id="director-title">
            MY IMPACT
            <br />
            <span>DIRECTOR.</span>
          </h1>
          <p className="director-proposition">
            Your own Impact Director.
            <br />
            <em>Without the full-time salary.</em>
          </p>
          <p className="director-promise">
            Making expert impact management affordable for every organisation.
            Human-led. AI-powered.
          </p>
          <p className="director-audience">
            Charities. Social enterprises. NGOs.
            <br />
            Purpose-driven businesses.
          </p>
          <p className="director-credit">
            A social enterprise initiative
            <br />
            developed by{" "}
            <a href="https://mysocialimpact.org">
              My Social Impact <Arrow diagonal />
            </a>
          </p>
          <UploadShortcut />
        </div>
        <div className="director-first-job">
          <div className="first-job-heading">
            <p>Your new Impact Director’s first job?</p>
            <h2>
              REVIEW YOUR
              <br />
              IMPACT REPORT.
            </h2>
            <div className="job-price">
              <strong>For free.</strong>
              <span>£0</span>
            </div>
            <p>
              Upload your PDF. Choose any of three complementary reviews, with
              practical recommendations.
            </p>
          </div>
          <Intake enabled={ready()} hero />
        </div>
      </section>
      <section
        className="today-moment campaign-width"
        id="how-it-works"
        aria-labelledby="today-title"
      >
        <div className="moment-intro">
          <h2 id="today-title">
            One report.
            <br />
            <em>Three perspectives.</em>
          </h2>
          <p>
            Upload. Review. Discover. Improve.
            <br />
            Three distinct questions. Your evidence. Clear next steps.
          </p>
        </div>
        <div className="framework-lines simple-assessments">
          {[
            {
              id: "claims",
              logo: "claims-code.png",
              name: "Social Impact Claims Code",
              question: "Can your impact claims stand up to scrutiny?",
              pillars:
                "Evidence · Proportion · Transparency · Balance · Learning",
              explanation:
                "We examine how responsibly your report makes and supports its impact claims. Stronger claims need stronger evidence. Twenty tests consider evidence, proportionality, transparency, balance and learning.",
              href: "https://mysocialimpact.org/social-impact-claims-code",
              link: "Read the published Claims Code",
            },
            {
              id: "excellence",
              logo: "excellence.png",
              name: "Social Impact Excellence",
              question: "What does your report show about managing impact?",
              pillars:
                "Purpose · Leadership · Data · Delivery · Communications",
              explanation:
                "We look at what your report demonstrates about understanding and managing impact. Twenty tests explore five management pillars. This is a report-based review, separate from a full organisational maturity assessment.",
              href: "/methodology#excellence",
              link: "Explore the detailed methodology",
            },
            {
              id: "report",
              logo: "the-impact-edit.svg",
              name: "The Impact Edit",
              question: "Does your impact report make an impact?",
              pillars:
                "Readability · Storytelling · Visual design · Data · Accessibility",
              explanation:
                "An indicative creative assessment of your report’s writing and actual page design. Twenty-five anchored criteria examine readability and hierarchy, storytelling, visual design, data communication and accessibility. Creative judgements are partly subjective; different readers may respond differently.",
              href: "/methodology/impact-report-excellence",
              link: "Read The Impact Edit Methodology v2.0.0",
            },
          ].map((f) => (
            <article className="assessment-introduction" key={f.id}>
              <div className="framework-line">
                <Image
                  src={`/brand/${f.logo}`}
                  alt={f.name}
                  width={120}
                  height={120}
                />
                <div>
                  <h3>{f.question}</h3>
                  <p>{f.pillars}</p>
                  <details className="assessment-method">
                    <summary>How this assessment works</summary>
                    <div>
                      <p>{f.explanation}</p>
                      <p>
                        Findings refer to your actual report, with specific
                        observations and practical improvements. Scores are
                        indicative; they do not independently verify your
                        organisation’s impact.
                      </p>
                      <a href={f.href}>{f.link} →</a>
                    </div>
                  </details>
                </div>
              </div>
            </article>
          ))}
        </div>
        <div className="methodology-line">
          <p>
            An automated document review. Indicative findings, with source
            references.
          </p>
          <Link href="/methodology">
            How we assess your report <Arrow diagonal />
          </Link>
        </div>
      </section>
      <SupportIntroduction />
      <section
        id="our-vision"
        className="purpose-moment"
        aria-labelledby="purpose-title"
      >
        <div className="campaign-width">
          <h2 id="purpose-title">
            Imagine a world where <em>social impact</em> was taken as seriously
            as financial performance.
          </h2>
          <div className="purpose-base">
            <p>
              That’s the vision of My Social Impact — and the reason we’re
              making expert impact management accessible to everyone.
            </p>
            <div>
              <h3>What if every organisation had its own Impact Director?</h3>
              <p>
                Experienced people. Social Impact Excellence. Powerful AI.
                <Link href="/#human-support"> Explore ongoing support →</Link>
              </p>
            </div>
          </div>
        </div>
      </section>
      <Contact />
    </div>
  );
}
