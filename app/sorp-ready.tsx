"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Footer, RevealObserver, SiteHeader } from "./site-shell";
import { SorpSnapshotLink } from "./sorp-snapshot-link";

const conversationUrl = "https://sorp2026.mysocialimpact.org";

const sectionLinks = [
  ["why-now", "Why now"],
  ["assessment", "Check readiness"],
  ["language", "Must / should / may"],
  ["path", "Ready → excellent"],
  ["result", "Your result"],
  ["review", "£50 review"],
] as const;

const readinessLanguage = [
  ["Must", "Required.", "Where SORP says something MUST be done, we make that clear."],
  ["Should", "Recommended.", "SORP uses SHOULD for recommendations intended to advance good reporting practice."],
  ["May", "Optional.", "SORP uses MAY where charities have a choice about whether to adopt a particular approach, treatment or disclosure."],
  ["Judgement", "It depends.", "Our additional MSI label for areas where context, evidence, materiality and proportionality genuinely matter."],
] as const;

const readinessAreas = [
  ["Purpose", "82"],
  ["Evidence", "61"],
  ["Impact", "72"],
  ["Learning", "54"],
  ["Reporting", "69"],
] as const;

function SorpNavigation() {
  const [active, setActive] = useState("why-now");

  useEffect(() => {
    const update = () => {
      const readingLine = window.innerHeight * .4;
      const reached = sectionLinks.filter(([id]) => {
        const section = document.getElementById(id);
        return section ? section.getBoundingClientRect().top <= readingLine : false;
      });
      setActive(reached.length ? reached[reached.length - 1][0] : "why-now");
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  useEffect(() => {
    document.querySelector<HTMLAnchorElement>(`.sorp-ready-nav a[href="#${active}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [active]);

  return (
    <nav className="sorp-ready-nav" aria-label="Are You SORP Ready sections">
      <div>{sectionLinks.map(([id, label], index) => <a key={id} className={active === id ? "is-active" : ""} href={`#${id}`}><span>0{index + 1}</span>{label}</a>)}</div>
    </nav>
  );
}

function SectionHeading({ number, eyebrow, title, copy }: { number: string; eyebrow: string; title: React.ReactNode; copy?: React.ReactNode }) {
  return (
    <header className="sorp-section-heading" data-reveal>
      <p className="sorp-section-label"><span>{number}</span>{eyebrow}</p>
      <h2>{title}</h2>
      {copy && <div className="sorp-section-copy">{copy}</div>}
    </header>
  );
}

export function SorpReadyPage() {
  const [bookingOpen, setBookingOpen] = useState(false);
  const bookingRef = useRef<HTMLDivElement>(null);

  const openBooking = () => {
    setBookingOpen(true);
    window.setTimeout(() => bookingRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
  };

  return (
    <>
      <RevealObserver />
      <SiteHeader />
      <main className="sorp-ready-page">
        <section className="sorp-ready-hero" id="top">
          <div className="sorp-ready-hero-bar" data-reveal>
            <span>SORP 2026 · Impact reporting</span>
            <strong>My Social Impact</strong>
          </div>
          <div className="sorp-ready-hero-grid">
            <div className="sorp-ready-title" data-reveal>
              <span className="sorp-ready-number">02</span>
              <h1>Are you<br />SORP ready?</h1>
            </div>
            <div className="sorp-ready-intro" data-reveal>
              <p className="sorp-ready-lead">SORP 2026 changes what many charities need to report about their impact.</p>
              <p>Find out where you stand — for free — and start getting ready before year-end.</p>
              <div className="sorp-ready-actions">
                <SorpSnapshotLink className="sorp-ready-action is-primary" arrow="→" />
                <a className="sorp-ready-action" href={conversationUrl} target="_blank" rel="noreferrer">Talk it through <span>↗</span></a>
              </div>
            </div>
          </div>
          <div className="sorp-ready-scope" data-reveal>
            <strong>Focused on impact.</strong>
            <p>This tool focuses specifically on the impact and narrative-reporting aspects of SORP 2026.</p>
            <p>It is not a complete assessment of every accounting requirement in the SORP.</p>
          </div>
        </section>

        <SorpNavigation />

        <section className="sorp-problem sorp-section" id="why-now">
          <SectionHeading number="01" eyebrow="The question to ask now" title={<>SORP 2026<br />is here.</>} copy={<><p>The question is not simply whether you can write a better annual report at year-end.</p><p>The question is whether your charity is collecting, reviewing and understanding the information it will need throughout the year.</p></>} />
          <div className="sorp-date-statement" data-reveal>
            <p>SORP 2026 applies to reporting periods beginning on or after</p>
            <strong>1 January<br />2026</strong>
            <span>For a charity with a calendar financial year, the first SORP 2026 accounts cover the year ending <b>31 December 2026.</b></span>
          </div>
          <blockquote className="sorp-big-quote" data-reveal>Start managing it now.<br /><em>Don’t start writing it later.</em></blockquote>
        </section>

        <section className="sorp-free sorp-section">
          <SectionHeading number="02" eyebrow="Useful from the start" title={<>Built to be useful.<br />And free to start.</>} copy={<><p>We know SORP can feel complicated — particularly for smaller charities trying to work out what actually applies to them.</p><p>So we built a free tool to translate the impact-reporting requirements into plain English and help charities understand where they stand.</p><p>If there is a clear answer, we want to give it. Human support comes in where context and judgement genuinely add something.</p></>} />
        </section>

        <section className="sorp-assessment sorp-section" id="assessment">
          <SectionHeading number="03" eyebrow="Choose how you think" title={<>Same assessment.<br />Two ways to do it.</>} />
          <div className="sorp-route-grid">
            <article className="sorp-route is-snapshot" data-reveal>
              <div className="sorp-route-top"><span>Route 01</span><strong>15 core questions<br />Around 8 minutes</strong></div>
              <h3>Quick<br />snapshot</h3>
              <p>For people who prefer a clear structure and want a quick picture of where they stand.</p>
              <SorpSnapshotLink startLabel="Take the snapshot" />
            </article>
            <article className="sorp-route is-conversation" data-reveal>
              <div className="sorp-route-top"><span>Route 02</span><strong>Have a conversation<br />instead</strong></div>
              <h3>Talk it<br />through</h3>
              <p>Prefer to explain things in your own words? Our SORP assistant covers the same areas conversationally, explains relevant requirements as you go and asks follow-up questions where useful.</p>
              <a href={conversationUrl} target="_blank" rel="noreferrer">Start a conversation <span>↗</span></a>
            </article>
          </div>

          <div className="sorp-route-note" data-reveal>
            <h3>We’re not particularly fond of forms either.</h3>
            <p>Some people prefer a structured questionnaire. Others find it easier to explain where they are conversationally.</p>
            <p>There’s no right way to do it — so we offer both.</p>
          </div>
        </section>

        <section className="sorp-language sorp-section" id="language">
          <SectionHeading number="04" eyebrow="Plain English, precise meaning" title={<>What do you actually<br />need to do?</>} />
          <div className="sorp-language-grid">
            {readinessLanguage.map(([term, status, copy], index) => <article className={term === "Judgement" ? "is-judgement" : ""} key={term} data-reveal style={{ "--delay": `${index * 60}ms` } as React.CSSProperties}><span>0{index + 1}</span><h3>{term}</h3><strong>{status}</strong><p>{copy}</p>{term === "Judgement" && <small>Judgement is an MSI explanatory category, not an official fourth SORP term.</small>}</article>)}
          </div>
          <p className="sorp-language-statement" data-reveal>We use SORP’s own <strong>MUST / SHOULD / MAY</strong> language — and highlight separately where <strong>judgement</strong> is needed.</p>
          <div className="sorp-judgement-factors" data-reveal><p>Judgement can depend on:</p>{["Circumstances", "Evidence", "Materiality", "Proportionality", "The nature of the charity", "The nature of the claim or activity"].map((item) => <span key={item}>{item}</span>)}</div>
        </section>

        <section className="sorp-eligibility sorp-section">
          <SectionHeading number="05" eyebrow="Who it applies to" title={<>Start with what<br />you know.</>} copy={<><p>Charities SORP 2026 applies to relevant charities preparing accruals accounts across England & Wales, Scotland and Northern Ireland.</p><p>You should not need to be an accountant to work out where to begin.</p></>} />
          <div className="sorp-accounts-grid" data-reveal>
            <article><span>Accruals accounts</span><p>Income and costs are recorded when they are earned or incurred, rather than simply when cash is received or paid.</p></article>
            <article><span>Receipts & payments accounts</span><p>A simpler approach based principally on money actually received and paid.</p></article>
            <article className="is-unsure"><span>Not sure?</span><p>That’s fine. The snapshot helps establish what applies rather than expecting you to know accounting terminology already.</p></article>
          </div>
          <div className="sorp-tiers" data-reveal>
            <header><p>SORP tiers</p><h3>Requirements depend partly on annual gross income.</h3></header>
            <div>{[["Tier 1", "Up to £500,000"], ["Tier 2", "Over £500,000 and up to £15 million"], ["Tier 3", "Over £15 million"]].map(([tier, income]) => <article key={tier}><span>{tier}</span><strong>{income}</strong></article>)}</div>
            <footer><strong>Not sure yet?</strong><p>If you don’t yet know where your income will land for the year, that’s fine. We can work provisionally and explain what changes if you cross a tier threshold.</p></footer>
          </div>
        </section>

        <section className="sorp-opportunity sorp-section">
          <SectionHeading number="06" eyebrow="Beyond the annual report" title={<>SORP is the requirement.<br />Better impact is the opportunity.</>} copy={<p>The point is not simply stronger annual-report wording. The bigger opportunity is to understand and manage impact better throughout the year.</p>} />
          <div className="sorp-opportunity-grid">
            <div data-reveal><p>Charities increasingly need to explain:</p>{["What they are trying to change", "What they actually did", "What happened", "What evidence supports that conclusion", "What they learned", "What they will do differently"].map((item, index) => <span key={item}><b>0{index + 1}</b>{item}</span>)}</div>
            <div data-reveal><p>This increasingly matters to:</p>{["Trustees", "Boards", "Grant funders", "Commissioners", "Major donors", "Individual supporters", "Partners"].map((item) => <span key={item}>{item}</span>)}</div>
          </div>
        </section>

        <section className="sorp-path sorp-section" id="path">
          <SectionHeading number="07" eyebrow="The bigger journey" title={<>Get ready → Get better<br />→ Get excellent.</>} />
          <div className="sorp-path-stages">
            <article data-reveal>
              <header><span>01</span><p>SORP 2026</p></header><h3>Get ready</h3><p>Understand what applies, what you MUST do, what you SHOULD do, what you MAY choose to do, where judgement is required and what may currently be missing.</p>
            </article>
            <article data-reveal>
              <header><span>02</span><p>Two frameworks, working together</p></header><h3>Get better</h3><div className="sorp-frameworks"><Link href="/social-impact-excellence"><strong>Social Impact Excellence</strong><small>Purpose · Leadership · Data · Delivery · Communications</small></Link><Link href="/social-impact-claims-code"><strong>Social Impact Claims Code</strong><small>Evidence · Proportion · Transparency · Balance · Learning</small></Link></div><p>Social Impact Excellence strengthens the organisation behind the reporting. The Social Impact Claims Code strengthens the credibility of the evidence, interpretation and claims.</p>
            </article>
            <article data-reveal>
              <header><span>03</span><p>A management discipline</p></header><h3>Get excellent</h3><p>Embed impact into strategy, planning, KPIs, dashboards, management information, meetings, resource allocation, programme decisions, learning and continuous improvement.</p>
            </article>
          </div>
          <blockquote className="sorp-path-quote" data-reveal>Don’t build an impact system just for SORP.<br /><em>Build a good impact system — and SORP becomes much easier.</em><small>When impact information is already part of how the charity is managed, annual reporting becomes an output of good management rather than a year-end scramble.</small></blockquote>
        </section>

        <section className="sorp-result sorp-section" id="result">
          <SectionHeading number="08" eyebrow="What the free result shows" title={<>A clear picture.<br />Useful next steps.</>} copy={<p>This is an illustrative example of the free result. Your own result is calculated only after you complete the snapshot.</p>} />
          <div className="sorp-result-card" data-reveal>
            <header><div><p>Your SORP 2026</p><h3>Impact readiness</h3></div><strong>68 <span>/ 100</span></strong></header>
            <div className="sorp-result-bars">{readinessAreas.map(([name, score]) => <div key={name}><span>{name}</span><i><b style={{ width: `${score}%` }} /></i><strong>{score}</strong></div>)}</div>
            <div className="sorp-result-findings">{["What looks strong", "What needs attention", "MUST requirements to address", "SHOULD opportunities", "MAY options", "Areas requiring judgement"].map((item, index) => <span key={item}><b>0{index + 1}</b>{item}</span>)}</div>
            <small>Illustrative front-end preview · not an assessment result</small>
          </div>
          <div className="sorp-continue" data-reveal><div><p>Want to explore your result?</p><h3>Continue with the SORP assistant.</h3><span>Your result is saved on this device ready for a future direct handoff. For now, the assistant opens separately and can help you explore the relevant requirements and judgement areas.</span></div><a href={conversationUrl} target="_blank" rel="noreferrer">Talk through my result <span>↗</span></a></div>
        </section>

        <section className="sorp-review sorp-section" id="review">
          <div className="sorp-review-heading" data-reveal><p><span>09</span>Want a human view?</p><h2>SORP 2026<br />Impact Readiness Review</h2><div><strong>£50</strong><span>60 minutes</span></div></div>
          <div className="sorp-review-grid">
            <div className="sorp-review-intro" data-reveal><p>If you would like us to review where you stand with you, book a one-hour Impact Readiness Review.</p><p>Before the meeting you can optionally send us your latest Trustees’ Annual Report and/or your latest Impact Report. If you do not have either yet, that is completely fine.</p></div>
            <div className="sorp-review-list" data-reveal><h3>During the session we will:</h3>{["Review your readiness result", "Consider your existing reporting", "Discuss what looks strong", "Identify areas that may need attention", "Talk through genuine judgement calls", "Identify practical next steps", "Explore where going beyond minimum compliance may strengthen the charity"].map((item, index) => <p key={item}><span>0{index + 1}</span>{item}</p>)}</div>
            <div className="sorp-review-output" data-reveal><h3>After the meeting, you receive a short written summary covering:</h3>{["What looks strong", "What needs attention", "Areas requiring judgement", "Your three priority actions", "Opportunities beyond compliance"].map((item) => <span key={item}>{item}</span>)}</div>
          </div>
          <div className="sorp-review-credit" data-reveal>If we subsequently work together on a My Social Impact project, we’ll credit the £50 review fee against that work.</div>
          <button className="sorp-book-button" type="button" onClick={openBooking}>Book my £50 review <span>→</span></button>
          {bookingOpen && <div className="sorp-booking-state" ref={bookingRef} aria-live="polite"><div><span>Booking</span><h3>Let’s arrange your review.</h3><p>Online checkout is not connected yet. You can book the £50 review by emailing Marcus now; we’ll confirm a suitable time and the simple next steps.</p></div><div><a href="mailto:marcus@mysocialimpact.org?subject=SORP%202026%20Impact%20Readiness%20Review">Email Marcus to book <span>↗</span></a><button type="button" onClick={() => setBookingOpen(false)}>Close</button></div></div>}
          <div className="sorp-review-scope" data-reveal><strong>This is an impact-reporting readiness review.</strong><p>It is focused on the impact and narrative aspects of SORP 2026. It is not a statutory audit, an audit opinion on the financial statements, a complete assessment of every accounting requirement in SORP, or certification by the Charity Commission or SORP-making body.</p></div>
        </section>

        <section className="sorp-next sorp-section">
          <SectionHeading number="10" eyebrow="Where next?" title={<>Support when it<br />genuinely helps.</>} />
          <div className="sorp-next-grid">{[
            ["SORP impact diagnostic", "A deeper evidence-based review of impact-reporting readiness.", "mailto:marcus@mysocialimpact.org?subject=SORP%20impact%20diagnostic"],
            ["Charity Impact Report", "Bring strategy, evidence, outcomes and stories together into credible reporting.", "/social-impact-report"],
            ["Social Impact Excellence", "Strengthen Purpose, Leadership, Data, Delivery and Communications.", "/social-impact-excellence"],
            ["Social Impact Claims Code", "Strengthen Evidence, Proportion, Transparency, Balance and Learning.", "/social-impact-claims-code"],
            ["Data & measurement", "Improve KPIs, evidence collection, dashboards and management information.", "mailto:marcus@mysocialimpact.org?subject=Data%20and%20measurement"],
          ].map(([name, copy, href], index) => href.startsWith("/") ? <Link href={href} key={name} data-reveal><span>0{index + 1}</span><h3>{name}</h3><p>{copy}</p><strong>Explore <b>→</b></strong></Link> : <a href={href} key={name} data-reveal><span>0{index + 1}</span><h3>{name}</h3><p>{copy}</p><strong>Talk to us <b>→</b></strong></a>)}</div>
        </section>

        <section className="sorp-final" data-reveal><p>SORP 2026 · Impact reporting</p><h2>This looks useful.<br /><em>I should probably deal with this now.</em></h2><div><SorpSnapshotLink arrow="→" /><a href={conversationUrl} target="_blank" rel="noreferrer">Talk it through <span>↗</span></a></div></section>
      </main>
      <Footer />
    </>
  );
}
