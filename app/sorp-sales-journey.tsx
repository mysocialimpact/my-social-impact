"use client";

import { useEffect, useState } from "react";

type Slide = { title: string; content: React.ReactNode };

function ForwardLine({ steps, finish = false }: { steps: string[]; finish?: boolean }) {
  return <div className={`sf-forward${finish ? " sf-forward-finish" : ""}`} style={{ "--steps": steps.length } as React.CSSProperties}>
    <svg viewBox={finish ? "0 0 1000 60" : "0 0 1000 32"} preserveAspectRatio="none" aria-hidden="true"><path d={finish ? "M 0 4 H 12 Q 22 4 22 14 V 17 Q 22 27 32 27 H 978 Q 988 27 988 37 V 60" : "M 0 4 H 12 Q 22 4 22 14 V 17 Q 22 27 32 27 H 968 Q 978 27 978 17 V 14 Q 978 4 988 4 H 1000"} /></svg>
    <ol>{steps.map((step, index) => <li key={step} style={{ "--order": index } as React.CSSProperties}><span>{step}</span></li>)}</ol>
  </div>;
}

function Marcus({ full = false }: { full?: boolean }) {
  return <div className="sf-credential">
    {/* vinext's local image optimizer has no ASSETS binding; this static public image is already WebP. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img className="sf-portrait" src="/images/marcus-warry-msi.webp" alt="Marcus Warry" width="96" height="96" />
    <div><strong>{full && "Developed by "}Marcus Warry ACA</strong><span>Chartered Accountant · Social Impact Consultant</span>{full && <span>Co-founder, My Social Impact</span>}</div>
  </div>;
}

function Card({ number, title, copy }: { number: string; title: string; copy: string }) {
  return <div className="sf-card"><span className="sf-number">{number}</span><h3>{title}</h3><p>{copy}</p></div>;
}

export function SorpSalesJourney({ startHref = "/are-you-sorp-ready/review?entry=intro" }: { startHref?: string }) {
  const [current, setCurrent] = useState(0);

  const slides: Slide[] = [
    { title: "Requirement → opportunity", content: <>
      <p className="sf-eyebrow">SORP 2026 · IMPACT &amp; SUSTAINABILITY</p>
      <h1>SORP is the requirement.<br /><em>Better impact is the opportunity.</em></h1>
      <ForwardLine steps={["THE REQUIREMENT", "THE OPPORTUNITY"]} />
      <div className="sf-introduction"><h2>Are You SORP Ready?</h2><p className="sf-lead">Find out where your charity stands — <strong>for free.</strong></p></div>
      <Marcus full />
      <p className="sf-scope">Focused on the impact and sustainability reporting aspects of SORP 2026.<br />Not a full SORP compliance review.</p>
    </> },
    { title: "Why impact matters now", content: <>
      <p className="sf-eyebrow">WHY IMPACT MATTERS NOW</p><h2>Expectations have changed.<br /><em>Evidence matters.</em></h2><p className="sf-lead">Funders, trustees, partners and communities increasingly expect charities to explain the difference they make — clearly and credibly.</p>
      <ForwardLine steps={["GOOD INTENT", "CLEAR PURPOSE", "USEFUL EVIDENCE", "CREDIBLE IMPACT"]} />
      <div className="sf-impact-grid"><article><span>01</span><h3>Trust</h3><p>Clear evidence makes reporting more credible and useful.</p></article><article><span>02</span><h3>Decisions</h3><p>Better information helps trustees and teams decide what to improve.</p></article><article><span>03</span><h3>Opportunity</h3><p>Strong impact practice supports funding, partnerships and sustainable growth.</p></article></div>
      <p className="sf-takeaway">SORP creates the prompt. <strong>Better impact practice creates the value.</strong></p>
    </> },
    { title: "We do the public homework", content: <>
      <p className="sf-eyebrow">WE DO THE HARD WORK FIRST</p><h2>We find <em>your charity.</em></h2><p className="sf-lead">The public homework, done for you.</p>
      <ForwardLine steps={["CHARITY FOUND", "DOES SORP APPLY?", "YOUR REPORTING TIER", "LATEST REPORT & ACCOUNTS"]} />
      <div className="sf-homework"><Card number="01" title="Registered charity" copy="Charity found ✓" /><Card number="02" title="SORP applies" copy="Accruals accounts ✓" /><Card number="03" title="Tier 2" copy="Reporting context established" /><Card number="04" title="Latest report found" copy="Trustees’ Annual Report & accounts ✓" /></div>
      <p className="sf-takeaway">We check the public record and establish the relevant reporting context <strong>before asking you anything.</strong></p><p className="sf-note">Illustrative charity and reporting context.</p>
    </> },
    { title: "Then · Historical Snapshot", content: <>
      <p className="sf-eyebrow"><em>THEN</em> · YOUR PUBLISHED REPORT</p><h2>Your <em>Historical Snapshot.</em></h2><p className="sf-lead">What your latest published Trustees’ Annual Report and accounts already demonstrate.</p>
      <ForwardLine steps={["PUBLISHED REPORT", "EXACT EVIDENCE", "SORP REQUIREMENT", "ASSESSMENT", "HISTORICAL SNAPSHOT"]} />
      <div className="sf-two-col sf-snapshot"><div className="sf-card"><p className="sf-label">YOUR HISTORICAL SNAPSHOT</p><h3>Reporting Strength</h3><p>Evidence against the requirements that apply to your charity.</p><div className="sf-tags"><span>MUST</span><span>SHOULD</span><span>MAY</span></div></div><div className="sf-findings"><p><span>01</span> Clearly demonstrated</p><p><span>02</span> Mostly demonstrated</p><p><span>03</span> Partly demonstrated</p><small>Illustrative assessment categories</small></div></div>
      <p className="sf-takeaway">Your published report shows <strong>what was evidenced then.</strong></p>
    </> },
    { title: "Now · Your current position", content: <>
      <p className="sf-eyebrow"><em>NOW</em> · YOUR CURRENT POSITION</p><h2>You tell us where<br /><em>things stand now.</em></h2><p className="sf-lead"><strong>19 focused questions</strong> — with space for your comments and context.</p>
      <ForwardLine steps={["HISTORICAL SNAPSHOT", "YOUR ANSWERS & COMMENTS", "CURRENT POSITION"]} />
      <div className="sf-card sf-question"><p className="sf-label">A QUICK CHECK-IN · ILLUSTRATIVE QUESTION</p><h3>Do your activities clearly connect to your charity’s purpose?</h3><div className="sf-answers">{["Clearly", "Mostly", "Partly", "Limited", "Not yet", "Not sure"].map(answer => <span className={answer === "Mostly" ? "sf-selected" : ""} key={answer}>{answer}</span>)}</div><div className="sf-context"><span>COMMENTS</span><span>CONTEXT</span><span>EVIDENCE ELSEWHERE</span></div></div>
      <p className="sf-takeaway">Tell us <strong>what has changed</strong>, what is already in place and what is still being developed.</p>
    </> },
    { title: "Next · Your free report", content: <>
      <p className="sf-eyebrow"><em>NEXT</em> · TWO VIEWS, ONE CLEAR REPORT</p><h2>Your personalised report<br /><em>is free.</em></h2><ForwardLine steps={["THEN + NOW", "YOUR PERSONALISED REPORT", "YOUR PRIORITIES"]} />
      <div className="sf-two-col sf-report"><div className="sf-benefits"><p>What’s strong</p><p>Where the gaps are</p><p>What matters most</p><p>What to do next</p></div><div className="sf-priorities"><p><span>01</span><strong>DO NOW</strong></p><p><span>02</span><strong>IMPROVE WHEN PRACTICAL</strong></p><p><span>03</span><strong>ALREADY STRONG / NO ACTION</strong></p></div></div>
      <p className="sf-report-logic">Your report showed what was evidenced <strong>then.</strong> You told us where things stand <strong>now.</strong> Your personalised report shows <strong>what to do next.</strong></p><div className="sf-assurance"><span>FREE ASSESSMENT</span><span>FREE PERSONALISED REPORT</span><span>NO OBLIGATION</span></div>
    </> },
    { title: "Every conclusion explained", content: <>
      <p className="sf-eyebrow">EVERY CONCLUSION EXPLAINED</p><h2>See exactly<br /><em>how we reached it.</em></h2><ForwardLine steps={["PUBLISHED TEXT", "SORP REQUIREMENT", "LOGICAL TEST", "RESULT"]} />
      <div className="sf-two-col sf-evidence"><div className="sf-card"><p className="sf-label">EXACT TEXT · ILLUSTRATIVE EXTRACT</p><blockquote>“We support local families through weekly advice sessions.”</blockquote><p className="sf-note">Requirement: connect activities to charitable purpose.</p></div><div className="sf-reasoning"><p>✓ Purpose stated</p><p>✓ Activities described</p><p>✕ Connection not explicit enough</p><div className="sf-result"><span>RESULT</span><strong>Mostly demonstrated</strong></div></div></div>
      <p className="sf-takeaway"><strong>Open any question</strong> to inspect the evidence, reasoning and result.</p><p className="sf-note">No mysterious score. No unexplained AI verdict.</p>
    </> },
    { title: "Beyond compliance · Social Impact Excellence", content: <>
      <p className="sf-eyebrow">BEYOND COMPLIANCE · SOCIAL IMPACT EXCELLENCE</p><h2>Better evidence.<br />Better decisions.<br /><em>Better impact.</em></h2><p className="sf-proposition">SORP is the requirement. <strong>Better impact is the opportunity.</strong></p>
      <ForwardLine steps={["SORP READINESS", "BETTER EVIDENCE", "BETTER DECISIONS", "BETTER IMPACT"]} />
      <div className="sf-pillars">{["Purpose", "Leadership", "Data", "Delivery", "Communication"].map((pillar, index) => <span key={pillar}><b>0{index + 1}</b>{pillar}</span>)}</div>
      <p className="sf-takeaway">Social Impact Excellence turns reporting into a management discipline — helping you <strong>define, embed, measure and communicate impact.</strong></p>
    </> },
    { title: "Start free", content: <>
      <p className="sf-eyebrow">START WITH WHAT YOU ALREADY HAVE</p><h2 className="sf-end-title">Are you<br /><em>SORP ready?</em></h2><div className="sf-action"><p>Find your charity.</p><p>Get your free report.</p><p><strong>Know what to do next.</strong></p></div>
      <ForwardLine steps={["YOUR CHARITY", "YOUR FREE REPORT", "YOUR NEXT STEP"]} finish />
      <a className="sf-cta" href={startHref}>START FREE <span aria-hidden="true">→</span></a><p className="sf-reassurance">No card. No surprise paywall. No obligation.</p><Marcus />
    </> },
  ];

  useEffect(() => {
    const requested = Number(new URLSearchParams(window.location.search).get("slide"));
    if (Number.isInteger(requested) && requested >= 1 && requested <= slides.length) queueMicrotask(() => setCurrent(requested - 1));
  }, [slides.length]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        setCurrent(value => Math.max(0, Math.min(slides.length - 1, value + (event.key === "ArrowRight" ? 1 : -1))));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slides.length]);

  const slide = slides[current];
  return <main className="sf-presentation"><div className="sorp-film" data-slide={current}>
    <div className="sf-stage" role="group" aria-label="Are You SORP Ready? presentation">
      <div className="sf-brand">MY SOCIAL IMPACT <span>ARE YOU SORP READY?</span></div><div className="sf-chapter">{String(current + 1).padStart(2, "0")} / 09</div>
      <section className={`sf-scene sf-scene-${current}`} aria-label={slide.title} aria-live="polite" aria-atomic="true">{slide.content}</section>
      <div className="sf-footer"><span>SORP IS THE REQUIREMENT. BETTER IMPACT IS THE OPPORTUNITY.</span><span>SORP 2026</span></div>
    </div>
    <div className="sf-controls"><button onClick={() => setCurrent(value => value - 1)} disabled={current === 0}>← Previous</button><p>Take your time. Move on when you’re ready.</p><output aria-live="polite">Slide {current + 1} of {slides.length}</output><button onClick={() => setCurrent(value => value + 1)} disabled={current === slides.length - 1}>Next →</button></div>
    <nav className="sf-chapters" aria-label="Presentation chapters">{slides.map((item, index) => <button key={item.title} aria-label={`${index + 1}. ${item.title}`} title={item.title} aria-current={current === index ? "step" : undefined} onClick={() => setCurrent(index)}><span aria-hidden="true" /></button>)}</nav>
  </div></main>;
}

export function SorpSalesLanding() {
  return <div className="sorp-sales-landing">
    <header className="sl-hero"><p>SORP 2026 · IMPACT &amp; SUSTAINABILITY</p><h1>Are you<br /><em>SORP ready?</em></h1><div><p>A free, evidence-led review of where your charity stood then, where it stands now and what to do next.</p><a href="#journey">See how it works <span>↓</span></a></div></header>
    <div id="journey"><SorpSalesJourney /></div>
    <section className="sl-supporting"><header><p>THE DETAIL, WHEN YOU NEED IT</p><h2>Clear scope.<br /><em>No surprises.</em></h2></header>
      <div className="sl-details">
        <details><summary>What the free review includes <span>+</span></summary><p>We find your charity, establish its reporting context, review its latest published Trustees’ Annual Report and accounts, ask 19 focused current-position questions, and produce a personalised report with priorities and next steps.</p></details>
        <details><summary>What this review does not cover <span>+</span></summary><p>This is focused on the impact and sustainability reporting aspects of SORP 2026. It is not a statutory audit, an audit opinion, a complete assessment of every accounting requirement, or certification by the Charity Commission or SORP-making body.</p></details>
        <details><summary>How the assessment stays transparent <span>+</span></summary><p>Published evidence and your current self-reported position remain separate. Every conclusion can be opened to inspect the relevant requirement, exact evidence, reasoning and result. The established methodology, scoring and assessment state are unchanged.</p></details>
        <details><summary>Optional support afterwards <span>+</span></summary><p>Your assessment and personalised report are free. If useful, you can separately book time with Marcus to discuss the findings and agree practical priorities. There is no obligation and no surprise paywall.</p></details>
      </div>
      <a className="sl-final-cta" href="/are-you-sorp-ready/review?entry=intro">START THE FREE REVIEW <span>→</span></a>
    </section>
  </div>;
}
