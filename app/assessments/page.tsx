import type { Metadata } from "next";
import Link from "next/link";
import { Footer, RevealObserver, SiteHeader } from "../site-shell";
import "./assessments.css";

export const metadata: Metadata = {
  title: "Start an Assessment",
  description: "Choose the My Social Impact assessment that fits where your organisation is now.",
};

export default function AssessmentsPage() {
  return (
    <>
      <RevealObserver />
      <SiteHeader />
      <main className="assessment-hub">
        <header className="assessment-hub-intro" data-reveal>
          <p>My Social Impact assessments</p>
          <h1>Start with<br />where you are.</h1>
          <span>Our assessments give you a practical picture of where you stand — and what may be worth doing next.</span>
        </header>

        <section className="assessment-hub-options" aria-label="Choose an assessment">
          <article className="assessment-choice is-maturity" data-reveal>
            <header><span>01</span><p>Social Impact Maturity Assessment</p></header>
            <h2>How strong is your approach to social impact?</h2>
            <div className="assessment-choice-copy">
              <p>Understand your current maturity across:</p>
              <ul><li>Purpose</li><li>Leadership</li><li>Data</li><li>Delivery</li><li>Communications</li></ul>
              <p>A structured starting point for organisations that want to understand, manage and improve their impact.</p>
            </div>
            <div className="assessment-choice-actions">
              <a className="is-primary" href="https://platform.mysocialimpact.org/snapshot" target="_blank" rel="noreferrer">Start the Maturity Assessment <span>↗</span></a>
              <Link href="/social-impact-excellence">Learn about Social Impact Excellence <span>→</span></Link>
            </div>
          </article>

          <article className="assessment-choice is-sorp" data-reveal>
            <header><span>02</span><p>SORP 2026 Impact Readiness</p></header>
            <h2>Are you SORP ready?</h2>
            <div className="assessment-choice-copy">
              <p>For UK charities preparing for the impact and narrative-reporting requirements of SORP 2026.</p>
              <p>Take a quick Snapshot or talk it through conversationally with our SORP assistant.</p>
            </div>
            <div className="assessment-choice-actions">
              <Link className="is-primary" href="/are-you-sorp-ready/snapshot">Check my SORP readiness <span>→</span></Link>
              <Link href="/are-you-sorp-ready">Learn about Are You SORP Ready? <span>→</span></Link>
            </div>
          </article>
        </section>

        <aside className="assessment-hub-guidance" data-reveal>
          <strong>Not sure which one you need?</strong>
          <p><b>SORP Readiness</b> is specifically about preparing for SORP 2026 impact reporting.</p>
          <p>The <b>Maturity Assessment</b> looks more broadly at how well your organisation manages social impact.</p>
        </aside>
      </main>
      <Footer />
    </>
  );
}
