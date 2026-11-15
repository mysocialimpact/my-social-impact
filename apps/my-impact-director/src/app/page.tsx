import Link from "next/link";
import { Arrow, DocumentIcon } from "@/components/icons";
import { ready } from "@/lib/reviews";
export const dynamic = "force-dynamic";
export default function Home() {
  return (
    <>
      <section className="hero section">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="status-dot" /> A clearer picture of your impact
          </div>
          <h1>
            How good is
            <br />
            your <em>impact report?</em>
          </h1>
          <p className="hero-description">
            You’re making a difference.
            <br />
            Let’s make sure your report shows it.
          </p>
          <p className="hero-detail">
            Get a free AI-powered review. Discover what’s working, what could be
            better, and how to tell a more credible, compelling impact story.
          </p>
          <Link href="/review" className="button primary">
            Review your impact report — free <Arrow />
          </Link>
          <p className="reassurance">
            Two complementary assessments. Practical recommendations.
            <br />
            Completely free.
          </p>
          {!ready() && (
            <p className="launch-note">
              Preparing for launch · Live reviews will open after validation.
            </p>
          )}
        </div>
        <div
          className="hero-art"
          aria-label="A preview of what your review examines, without example scores"
        >
          <div className="report-sheet">
            <div className="sheet-top">
              <span>MY IMPACT DIRECTOR</span>
              <span>REPORT REVIEW</span>
            </div>
            <DocumentIcon />
            <h2>
              From a good story
              <br />
              to <em>credible impact.</em>
            </h2>
            <div className="sheet-rule" />
            <p className="sheet-caption">TWO LENSES. ONE CLEARER PICTURE.</p>
            <div className="sheet-framework">
              <span className="framework-number">01</span>
              <div>
                <strong>Can your claims stand up?</strong>
                <p>Social Impact Claims Code</p>
              </div>
              <span className="small-arrow">↗</span>
            </div>
            <div className="sheet-framework">
              <span className="framework-number">02</span>
              <div>
                <strong>What does your report show?</strong>
                <p>Social Impact Excellence</p>
              </div>
              <span className="small-arrow">↗</span>
            </div>
            <div className="sheet-bottom">
              <span className="tiny-check">✓</span> Evidence first. Insight you
              can act on.
            </div>
          </div>
          <div className="art-note">
            <span className="note-star">✳</span>
            <div>
              <strong>Built on evidence.</strong>
              <span>Designed to help you improve.</span>
            </div>
          </div>
          <span className="art-orbit" aria-hidden="true" />
        </div>
      </section>
      <div className="trust-strip">
        <span>FOR ORGANISATIONS OF EVERY SIZE</span>
        <p>
          Community organisations <i>·</i> Charities <i>·</i> Social enterprises{" "}
          <i>·</i> Purpose-led businesses
        </p>
      </div>
      <section className="section how" id="how-it-works">
        <div className="section-heading">
          <div>
            <p className="eyebrow">A little clarity goes a long way</p>
            <h2>
              Your report.
              <br />
              <em>A fresh perspective.</em>
            </h2>
          </div>
          <p>
            No complex dashboard. No impact jargon to learn. Just a useful
            starting point for your next, better report.
          </p>
        </div>
        <div className="steps">
          <article>
            <span>01 / SHARE</span>
            <DocumentIcon />
            <h3>Bring your report</h3>
            <p>
              Create a free account, then upload a PDF or find a published
              report by organisation name.
            </p>
          </article>
          <article>
            <span>02 / UNDERSTAND</span>
            <div className="step-symbol" aria-hidden="true">
              ◎
            </div>
            <h3>See it through two lenses</h3>
            <p>
              We examine the evidence behind your claims and what your report
              demonstrates about your impact approach.
            </p>
          </article>
          <article>
            <span>03 / IMPROVE</span>
            <div className="step-symbol" aria-hidden="true">
              ↗
            </div>
            <h3>Know what to do next</h3>
            <p>
              Explore source-linked findings, get a prioritised action plan and
              download your assessment.
            </p>
          </article>
        </div>
      </section>
      <section className="framework-section">
        <div className="section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">More than a single score</p>
              <h2>
                Two assessments.
                <br />
                <em>Different questions.</em>
              </h2>
            </div>
            <p>
              Credible claims and thoughtful impact management belong together.
              Our reviews make the distinction clear.
            </p>
          </div>
          <div className="framework-grid">
            <article>
              <span className="tag">01 · THE CREDIBILITY OF YOUR CLAIMS</span>
              <h3>
                Social Impact
                <br />
                Claims Code
              </h3>
              <p>
                How responsibly does your report make and support its social
                impact claims?
              </p>
              <div className="pill-list">
                {[
                  "Evidence",
                  "Proportion",
                  "Transparency",
                  "Balance",
                  "Learning",
                ].map((x) => (
                  <span key={x}>{x}</span>
                ))}
              </div>
              <a
                href="https://mysocialimpact.org/social-impact-claims-code"
                className="text-link"
              >
                Explore the Claims Code <Arrow diagonal />
              </a>
            </article>
            <article>
              <span className="tag">02 · WHAT YOUR REPORT DEMONSTRATES</span>
              <h3>
                Social Impact
                <br />
                Excellence
              </h3>
              <p>
                What does your report show about how you understand, manage and
                communicate impact?
              </p>
              <div className="pill-list">
                {[
                  "Purpose",
                  "Leadership",
                  "Data",
                  "Delivery",
                  "Communications",
                ].map((x) => (
                  <span key={x}>{x}</span>
                ))}
              </div>
              <a
                href="https://socialimpactexcellence.org"
                className="text-link"
              >
                Explore the full framework <Arrow diagonal />
              </a>
            </article>
          </div>
          <p className="framework-footnote">
            An automated review of the report, not independent assurance or the
            full Social Impact Excellence Maturity Assessment.{" "}
            <Link href="/methodology">Understand our methodology →</Link>
          </p>
        </div>
      </section>
      <section className="section services-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Technology, with people behind it</p>
            <h2>
              Free insight.
              <br />
              <em>Expert help when you need it.</em>
            </h2>
          </div>
          <p>
            Use the review independently. If you’d like to go deeper, the My
            Social Impact team can help.
          </p>
        </div>
        <div className="service-grid">
          {[
            [
              "expert-review",
              "Expert report review",
              "Turn your findings into practical improvements with a professional review and conversation.",
            ],
            [
              "preparation",
              "Create an impact report",
              "Understand your impact, collect the evidence and tell a credible, compelling story.",
            ],
            [
              "digitisation",
              "Bring your report to life",
              "Turn your static PDF into an engaging, interactive digital experience.",
            ],
          ].map(([slug, title, description], i) => (
            <Link
              className="service-card"
              href={"/services/" + slug}
              key={slug}
            >
              <span className="service-index">0{i + 1}</span>
              <h3>{title}</h3>
              <p>{description}</p>
              <span className="text-link">
                Let’s talk <Arrow />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section className="vision">
        <div className="section">
          <p className="eyebrow">Why we’re here</p>
          <h2>
            Imagine a world where
            <br />
            <em>social impact</em> was taken
            <br />
            as seriously as financial performance.
          </h2>
          <div className="vision-copy">
            <span className="vision-star" aria-hidden="true">
              ✳
            </span>
            <div>
              <p>That’s the world we’re working towards.</p>
              <p>
                My Impact Director is a social enterprise initiative developed
                by My Social Impact. We believe every organisation should have
                the tools and insight to understand the difference it makes.
              </p>
              <p>
                Understanding your impact shouldn’t be unnecessarily complicated
                or expensive. That’s why our initial report reviews are free.
              </p>
              <a href="https://mysocialimpact.org" className="text-link">
                Meet My Social Impact <Arrow diagonal />
              </a>
            </div>
          </div>
        </div>
      </section>
      <section className="section future">
        <p className="eyebrow">A bigger ambition · Coming next</p>
        <h2>
          What if every organisation had
          <br />
          its own <em>Impact Director?</em>
        </h2>
        <p>
          An intelligent partner to help you question assumptions, learn from
          evidence and make better decisions throughout the year. We’re
          exploring how agentic AI could make that possible.
        </p>
        <Link href="/review" className="button primary">
          Start with your report <Arrow />
        </Link>
      </section>
    </>
  );
}
