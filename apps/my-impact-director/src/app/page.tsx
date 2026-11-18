import { Contact } from "@/components/contact";
import { Arrow } from "@/components/icons";
import Image from "next/image";
import Link from "next/link";
import { SupportIntroduction } from "@/components/support-introduction";
import { ReportServices } from "@/components/report-services";
import { ChapterMotion } from "@/components/chapter-motion";

export const dynamic = "force-dynamic";
const perspectives = [
  {
    id: "claims",
    logo: "claims-code.png",
    name: "Social Impact Claims Code",
    question: "Can your impact claims stand up to scrutiny?",
    pillars: "Evidence · Proportion · Transparency · Balance · Learning",
    explanation:
      "We examine how responsibly your report makes and supports its impact claims. Stronger claims need stronger evidence. Twenty tests consider evidence, proportionality, transparency, balance and learning.",
    href: "https://mysocialimpact.org/social-impact-claims-code",
    link: "Read the published Claims Code",
  },
  {
    id: "excellence",
    logo: "excellence.png",
    name: "Social Impact Excellence",
    question: "What does your report demonstrate about how you manage impact?",
    pillars: "Purpose · Leadership · Data · Delivery · Communications",
    explanation:
      "We look at what your report demonstrates about understanding and managing impact. Twenty tests explore five management pillars. This is a report-based review, separate from a full organisational maturity assessment.",
    href: "/methodology#excellence",
    link: "Explore the detailed methodology",
  },
  {
    id: "report",
    logo: "impact-design-review-transparent.png",
    name: "The Impact Design Review",
    question: "Does your impact report make an impact?",
    pillars:
      "Readability & Copy · Information Hierarchy · Visual Design · Storytelling · Data Presentation",
    explanation:
      "A creative director’s assessment of readability and copy, information hierarchy, visual design and art direction, storytelling and data presentation. Twenty-five anchored criteria examine the actual publication. AI-assisted creative judgements are partly subjective.",
    href: "/methodology/impact-report-excellence",
    link: "Read The Impact Design Review Methodology v2.0 — beta",
  },
] as const;

export default function Home() {
  return (
    <div className="campaign creative-home">
      <ChapterMotion />
      <section
        id="introduction"
        className="meet-director"
        aria-labelledby="director-title"
      >
        <div className="campaign-width meet-composition">
          <div className="meet-identity" data-reveal>
            <p className="chapter-label">01 / MEET YOUR IMPACT DIRECTOR</p>
            <h1 id="director-title">
              MY IMPACT
              <br />
              <span>DIRECTOR.</span>
            </h1>
            <p className="meet-signature">
              Human-led. <em>AI-powered.</em>
            </p>
          </div>
          <div className="meet-proposition" data-reveal>
            <h2>
              Imagine every organisation having its own{" "}
              <em>Impact Director.</em>
            </h2>
            <p>
              We’re building an intelligent Impact Director that combines AI
              with experienced human professionals to help organisations
              understand, manage and improve their impact.
            </p>
            <p className="meet-credit">
              A social enterprise initiative developed by{" "}
              <a href="https://mysocialimpact.org">
                My Social Impact <Arrow diagonal />
              </a>
            </p>
          </div>
          <a className="first-job-cue" href="#first-job">
            <span>Your Impact Director’s first job is ready.</span>
            <span className="cue-discover">
              Discover it{" "}
              <span className="cue-arrow" aria-hidden="true">
                ↓
              </span>
            </span>
          </a>
        </div>
      </section>
      <section
        id="first-job"
        className="review-studio"
        aria-labelledby="first-job-title"
      >
        <div className="campaign-width">
          <div className="studio-heading" data-reveal>
            <div>
              <p className="chapter-label">
                02 / YOUR IMPACT DIRECTOR’S FIRST JOB
              </p>
              <h2 id="first-job-title">
                Let’s review your impact report. <em>For free.</em>
              </h2>
            </div>
            <p>
              Upload once. Discover three different perspectives, with practical
              recommendations to help you improve.
            </p>
          </div>
          <div className="studio-columns">
            <div className="studio-upload">
              <div className="homepage-review-invitation" id="upload">
                <p className="eyebrow">ONE PDF. A CLEARER WAY FORWARD.</p>
                <h3>
                  Your first
                  <br />
                  <em>free review.</em>
                </h3>
                <p>
                  Discover what’s convincing, what’s missing and what to do
                  next.
                </p>
                <Link className="button primary" href="/review">
                  Try your first free review <Arrow />
                </Link>
                <p className="fine-print">
                  Create your free account on the next page. Your reports and
                  progress stay together.
                </p>
              </div>
            </div>
            <div className="studio-perspectives" id="how-it-works">
              <h3>One report. Three perspectives.</h3>
              {perspectives.map((f) => (
                <article className="studio-framework" key={f.id}>
                  <Image
                    src={`/brand/${f.logo}`}
                    alt={f.name}
                    width={104}
                    height={104}
                  />
                  <div>
                    <h4>{f.name}</h4>
                    <p className="framework-question">{f.question}</p>
                    <p className="framework-pillars">{f.pillars}</p>
                    <details className="assessment-method">
                      <summary>How this assessment works</summary>
                      <div>
                        <p>{f.explanation}</p>
                        <p>
                          Indicative scores, source references and practical
                          improvements. These reviews do not independently
                          verify your organisation’s impact.
                        </p>
                        <a href={f.href}>{f.link} →</a>
                      </div>
                    </details>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
      <ReportServices />
      <SupportIntroduction />
      <Contact />
    </div>
  );
}
