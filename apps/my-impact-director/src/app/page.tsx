import { Contact } from "@/components/contact";
import { Arrow } from "@/components/icons";
import Link from "next/link";
import Image from "next/image";
import { Intake } from "@/components/intake";
import { SupportIntroduction } from "@/components/support-introduction";
import { ReportServices } from "@/components/report-services";
import { ready } from "@/lib/reviews";
export const dynamic = "force-dynamic";
export default function Home() {
  return (
    <div className="campaign">
      <section
        id="introduction"
        className="director-opening commercial-opening"
        aria-labelledby="director-title"
      >
        <div className="director-identity">
          <h1 id="director-title">
            MY IMPACT
            <br />
            <span>DIRECTOR.</span>
          </h1>
          <p className="director-proposition">
            Imagine every organisation having its own <em>Impact Director.</em>
          </p>
          <p className="director-promise">
            We’re building an intelligent, AI-powered Impact Director, combining
            powerful technology with experienced human professionals to help
            organisations understand, manage and improve their social impact.
          </p>
          <p className="director-audience">
            AI-powered. Human-led.
            <br />
            The ambition is developing. The professional human service is
            available now.
          </p>
          <p className="director-credit">
            A social enterprise initiative
            <br />
            developed by{" "}
            <a href="https://mysocialimpact.org">
              My Social Impact <Arrow diagonal />
            </a>
          </p>
        </div>
        <div className="director-first-job">
          <div className="first-job-heading">
            <h2 className="first-job-ready">
              YOUR IMPACT DIRECTOR’S
              <br />
              FIRST JOB IS READY.
            </h2>
            <p className="first-job-action">
              LET’S REVIEW YOUR IMPACT REPORT.<strong>FOR FREE.</strong>
            </p>
            <p className="first-job-explanation">
              Upload your report. Explore its evidence, approach to managing
              impact and creative communication.
            </p>
            <p className="first-job-reassurance">
              Three complementary reviews. Practical recommendations. No payment
              required.
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
              question:
                "What does your report demonstrate about how you manage impact?",
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
      <ReportServices />
      <SupportIntroduction />
      <Contact />
    </div>
  );
}
