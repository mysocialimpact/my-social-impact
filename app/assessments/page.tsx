import type { Metadata } from "next";
import Link from "next/link";
import { Footer, RevealObserver, SiteHeader } from "../site-shell";
import "./assessments.css";

export const metadata: Metadata = {
  title: "Explore Assessments",
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
          <h1>Which assessment<br />is right for you?</h1>
          <span>Understand what each assessment is for before choosing where to begin.</span>
        </header>

        <section className="assessment-hub-options" aria-label="Choose an assessment">
          <article className="assessment-choice is-maturity" data-reveal>
            <header><span>01</span><p>Social Impact Maturity Assessment</p></header>
            <h2>How strong is your approach to social impact?</h2>
            <div className="assessment-choice-copy">
              <p>A broader assessment of how well your organisation understands, manages and improves social impact across:</p>
              <ul><li>Purpose</li><li>Leadership</li><li>Data</li><li>Delivery</li><li>Communications</li></ul>
            </div>
            <div className="assessment-choice-actions">
              <Link className="is-primary" href="/social-impact-excellence">Explore Social Impact Excellence <span>→</span></Link>
            </div>
          </article>

          <article className="assessment-choice is-sorp" data-reveal>
            <header><span>02</span><p>SORP 2026 Impact Readiness</p></header>
            <h2>Are you SORP ready?</h2>
            <div className="assessment-choice-copy">
              <p>A completely free guided conversation for charities and the accountants and advisers who support them.</p>
              <p>Ask SORP questions, understand what applies to your situation and receive a practical readiness report at the end. No card and no surprise paywall.</p>
            </div>
            <div className="assessment-choice-actions">
              <Link className="is-primary" href="/are-you-sorp-ready/conversation">Start your free SORP conversation <span>→</span></Link>
              <Link href="/are-you-sorp-ready">Explore SORP Readiness <span>→</span></Link>
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
