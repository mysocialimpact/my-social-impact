"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Footer, RevealObserver, SiteHeader } from "./site-shell";

const excellenceSections = [
  ["excellence", "Excellence"],
  ["five-pillars", "Five pillars"],
  ["why-it-matters", "Why it matters"],
  ["journey", "The journey"],
  ["maturity", "Maturity"],
  ["platform", "Platform"],
  ["get-started", "Get started"],
] as const;

const pillars = [
  { number: "01", name: "Purpose", line: "Know why you exist.", copy: "Define a clear and meaningful purpose, understand the change you are trying to create and make sure that purpose genuinely influences strategy.", icon: "/assets/excellence/purpose.png", iconOnly: "/assets/excellence/purpose-icon.png" },
  { number: "02", name: "Leadership", line: "Make impact everyone’s responsibility.", copy: "Create leadership, governance, accountability and a culture where impact matters when decisions are made.", icon: "/assets/excellence/leadership.png", iconOnly: "/assets/excellence/leadership-icon.png" },
  { number: "03", name: "Data", line: "Know what’s actually happening.", copy: "Collect useful evidence, measure what matters and turn information into insight that people can actually use.", icon: "/assets/excellence/data.png", iconOnly: "/assets/excellence/data-icon.png" },
  { number: "04", name: "Delivery", line: "Turn purpose into outcomes.", copy: "Translate ambition into programmes, products, services and activities capable of creating meaningful change.", icon: "/assets/excellence/delivery.png", iconOnly: "/assets/excellence/delivery-icon.png" },
  { number: "05", name: "Communications", line: "Tell the story with substance.", copy: "Engage stakeholders and communicate impact clearly, credibly and transparently.", icon: "/assets/excellence/communications.png", iconOnly: "/assets/excellence/communications-icon.png" },
] as const;

const journey = [
  { number: "01", name: "Maturity assessment", question: "Where are you now?", purpose: "Establish current maturity across the five pillars.", output: "Maturity profile" },
  { number: "02", name: "Diagnostic", question: "Why are you there?", purpose: "Understand strengths, weaknesses, gaps, behaviours, systems and existing practice.", output: "Diagnostic" },
  { number: "03", name: "Blueprint", question: "What should excellence look like for you?", purpose: "Define an appropriate future state across the five pillars.", output: "Social Impact Excellence Blueprint" },
  { number: "04", name: "Roadmap", question: "How do you get there?", purpose: "Turn the blueprint into priorities, actions, responsibilities and sequencing.", output: "Practical roadmap" },
  { number: "05", name: "Continuous improvement", question: "How do you keep getting better?", purpose: "Implement. Measure. Learn. Strengthen. Reassess.", output: "Increasing maturity and better impact" },
] as const;

function ExcellenceNavigation() {
  const [active, setActive] = useState("excellence");

  useEffect(() => {
    const update = () => {
      const readingLine = window.innerHeight * 0.34;
      const reached = excellenceSections.filter(([id]) => {
        const element = document.getElementById(id);
        return element ? element.getBoundingClientRect().top <= readingLine : false;
      });
      setActive(reached.length ? reached[reached.length - 1][0] : "excellence");
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  useEffect(() => {
    document.querySelector<HTMLAnchorElement>(`.sie-subnav a[href="#${active}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [active]);

  const links = excellenceSections.map(([id, label]) => <a key={id} className={active === id ? "is-active" : ""} href={`#${id}`} aria-current={active === id ? "location" : undefined}>{label}</a>);
  return <nav className="sie-subnav" aria-label="Social Impact Excellence sections"><div>{links}</div></nav>;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="sie-eyebrow"><span aria-hidden="true" />{children}</p>;
}

function SectionLead({ number, eyebrow, title, children }: { number?: string; eyebrow: string; title: React.ReactNode; children?: React.ReactNode }) {
  return <div className="sie-section-lead" data-reveal><div><Eyebrow>{eyebrow}</Eyebrow>{number && <span className="sie-section-number">{number}</span>}</div><h2>{title}</h2>{children && <div className="sie-lead-copy">{children}</div>}</div>;
}

function AssessmentAction({ children = "Start your Social Impact Maturity Snapshot" }: { children?: React.ReactNode }) {
  return <a className="sie-action" href="https://platform.mysocialimpact.org/" target="_blank" rel="noreferrer"><span><strong>{children}</strong><small>Start today · your first step takes about 10–15 minutes</small></span><b aria-hidden="true">↗</b></a>;
}

function PillarIcon({ pillar, compact = false, iconOnly = false }: { pillar: typeof pillars[number]; compact?: boolean; iconOnly?: boolean }) {
  return <div className={`sie-pillar-icon ${compact ? "is-compact" : ""}`}><Image src={iconOnly ? pillar.iconOnly : pillar.icon} alt="" width={260} height={260} unoptimized /></div>;
}

function Blueprint() {
  return <div className="sie-blueprint" data-reveal>
    <div className="sie-blueprint-intro"><span>System map · 01-05</span><p>The five pillars form the structure. Every stage strengthens the whole system.</p></div>
    <div className="sie-blueprint-desktop" role="img" aria-label="The five Social Impact Excellence pillars are strengthened through maturity assessment, diagnostic, blueprint, roadmap and continuous improvement">
      <div className="sie-blueprint-stage-head"><span aria-hidden="true" />{journey.map(stage => <div key={stage.name}><b>{stage.number}</b><strong>{stage.name}</strong></div>)}</div>
      <div className="sie-blueprint-map">
        {pillars.map((pillar) => <div className="sie-blueprint-track" key={pillar.name}><div className="sie-blueprint-pillar"><PillarIcon pillar={pillar} compact iconOnly /><strong>{pillar.name}</strong></div><div className="sie-blueprint-beam"><span /><span /><span /><span /><span /></div></div>)}
        <div className="sie-blueprint-return"><span>Continuous improvement</span><b aria-hidden="true">↺</b><span>Reassess</span></div>
      </div>
    </div>
    <div className="sie-blueprint-mobile" role="img" aria-label="The Social Impact Excellence journey, with every stage considering all five pillars">
      {journey.map((stage) => <article key={stage.name}><header><span>{stage.number}</span><h3>{stage.name}</h3></header><strong>{stage.question}</strong><p>{stage.purpose}</p><div className="sie-mobile-pillar-row" role="img" aria-label="Purpose, Leadership, Data, Delivery and Communications">{pillars.map(pillar => <PillarIcon key={pillar.name} pillar={pillar} compact />)}</div><footer><span>Output</span>{stage.output}</footer></article>)}
    </div>
    <div className="sie-blueprint-callout"><p><span>What</span>The five pillars define what needs to be strong.</p><p><span>How</span>The journey defines how we strengthen it.</p></div>
  </div>;
}

export function SocialImpactExcellencePage() {
  return <><RevealObserver /><SiteHeader /><ExcellenceNavigation /><main className="sie-page">
    <section className="sie-hero" id="excellence">
      <div className="sie-hero-top" data-reveal><Eyebrow>Social Impact Excellence</Eyebrow><p>My Social Impact’s flagship methodology</p></div>
      <h1 data-reveal>Imagine a world where social impact was taken as seriously as financial performance.</h1>
      <div className="sie-hero-bottom" data-reveal><strong>Social impact should be treated as a management discipline.</strong><div><p>Organisations don’t achieve financial excellence simply by producing annual accounts. They build leadership, systems, information, accountability and ways of continually improving performance.</p><p>Social impact deserves the same rigour.</p><p>Social Impact Excellence is our flagship methodology for helping organisations embed impact into how they think, decide, operate, measure, learn and communicate.</p><AssessmentAction /></div></div>
    </section>

    <section className="sie-reassurance">
      <div data-reveal><Eyebrow>Proportionate from the start</Eyebrow><h2>Serious doesn’t have to mean complicated.</h2></div>
      <div className="sie-reassurance-statement" data-reveal><p>The principles remain the same.</p><strong>The approach is proportionate.</strong></div>
      <div className="sie-reassurance-copy" data-reveal><div><p>Social Impact Excellence is designed for organisations of very different sizes, from small charities and social enterprises to major organisations, investors and funders.</p><p>A small organisation shouldn’t need the systems, resources or evidence base of a multinational.</p></div><div><p>We tailor the depth of the work to the organisation, its resources, its ambitions and the nature of the impact it is trying to create.</p><p>Smart use of technology and AI helps us make rigorous thinking and high-quality support faster and more accessible.</p></div></div>
      <p className="sie-orange-line" data-reveal>Excellence means doing what is appropriate, and doing it well.</p>
    </section>

    <section className="sie-definition" id="five-pillars">
      <SectionLead number="01" eyebrow="What is Social Impact Excellence?" title={<>From good intentions to a management discipline.</>}><p>Lots of organisations care deeply about their impact.</p><p>But caring about impact and managing for impact are different things.</p></SectionLead>
      <div className="sie-purpose-flow" role="img" aria-label="Purpose leads to decisions, action, evidence, learning and better impact" data-reveal>{["Purpose", "Decisions", "Action", "Evidence", "Learning", "Better impact"].map((item, index) => <div key={item}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item}</strong>{index < 5 && <i aria-hidden="true">→</i>}</div>)}</div>
      <div className="sie-definition-copy" data-reveal><p>Social Impact Excellence means embedding impact into the organisation itself.</p><p>It means understanding what you’re trying to change, putting responsibility behind it, delivering effectively, gathering useful evidence, learning from what happens and using that knowledge to make better decisions.</p></div>
      <div className="sie-measure-manage" data-reveal><article><span>Measuring impact</span><p>Helps you understand what happened.</p></article><i aria-hidden="true">+</i><article><span>Managing for impact</span><p>Helps you make better things happen.</p></article><strong>Social Impact Excellence is about both.</strong></div>
    </section>

    <section className="sie-pillars">
      <SectionLead number="02" eyebrow="The five pillars" title={<>Excellence is a system.</>}><p>Our Social Impact Excellence methodology is built around five interconnected pillars. Strength in one area cannot compensate indefinitely for weakness in another.</p></SectionLead>
      <div className="sie-pillar-list">{pillars.map((pillar) => <article className={pillar.name === "Communications" ? "is-communications" : undefined} key={pillar.name} data-reveal><header><span>{pillar.number}</span><PillarIcon pillar={pillar} iconOnly /></header><div><h3>{pillar.name}</h3><strong>{pillar.line}</strong><p>{pillar.copy}</p></div></article>)}</div>
    </section>

    <section className="sie-weakest">
      <div className="sie-weakest-head" data-reveal><Eyebrow>The system test</Eyebrow><h2>You’re only as strong as your weakest pillar.</h2></div>
      <div className="sie-structure" role="img" aria-label="A structure supported by five pillars where the shorter Data pillar compromises the whole system" data-reveal><div className="sie-structure-beam"><span>Social Impact Excellence</span></div><div className="sie-structure-pillars">{pillars.map((pillar, index) => <div className={index === 2 ? "is-weak" : ""} key={pillar.name}><span>{pillar.number}</span><strong>{pillar.name}</strong></div>)}</div></div>
      <div className="sie-weak-examples" data-reveal>{[
        ["Great delivery + weak data", "Impact you struggle to understand or prove."],
        ["Great purpose + weak delivery", "Good intentions."],
        ["Great data + weak leadership", "Evidence that doesn’t change decisions."],
        ["Great communications + weak evidence", "Claims people may struggle to trust."],
      ].map(([title, copy], index) => <article key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{copy}</p></article>)}</div>
      <p className="sie-system-close" data-reveal>Excellence comes from strengthening the whole system.</p>
    </section>

    <section className="sie-unlocks" id="why-it-matters">
      <SectionLead number="03" eyebrow="What excellence unlocks" title={<>Better impact.<br />Better organisations.</>}><p>Social Impact Excellence isn’t about creating more process for the sake of it. It helps organisations create more meaningful impact and become better at understanding, managing and improving it.</p></SectionLead>
      <div className="sie-outcome-grid">{[
        ["Greater impact", "Understand what works, what doesn’t and where you can make a bigger difference."],
        ["Better decisions", "Put meaningful evidence into the hands of the people deciding what happens next."],
        ["Trust & credibility", "Support what you say with evidence, transparency and good practice."],
        ["Investment & funding", "Give investors, funders and partners greater confidence in the impact you create."],
        ["Resilience & value", "Build the capability to create sustainable social and environmental value over time."],
        ["Brand & talent", "Give customers, employees and stakeholders stronger reasons to believe in what you do."],
      ].map(([title, copy], index) => <article key={title} data-reveal><span>0{index + 1}</span><h3>{title}</h3><p>{copy}</p></article>)}</div>
    </section>

    <section className="sie-journey" id="journey">
      <SectionLead number="04" eyebrow="The Social Impact Excellence journey" title={<>Excellence starts with understanding where you are.</>}><p>The process moves from a clear picture of today to a practical system for continuous improvement.</p></SectionLead>
      <div className="sie-journey-line" data-reveal>{journey.map((stage, index) => <div key={stage.name}><span>{stage.number}</span><strong>{stage.name}</strong>{index < journey.length - 1 && <i aria-hidden="true">→</i>}</div>)}</div>
      <div className="sie-blueprint-title" data-reveal><Eyebrow>Signature methodology</Eyebrow><h2>The Social Impact Excellence Blueprint</h2><p>Five pillars. One management system. A continuous journey of improvement.</p></div>
      <Blueprint />
      <div className="sie-stage-details">{journey.map(stage => <article key={stage.name} data-reveal><header><span>{stage.number}</span><h3>{stage.name}</h3></header><strong>{stage.question}</strong><p>{stage.purpose}</p><footer><span>Output</span>{stage.output}</footer></article>)}</div>
      <div className="sie-inline-cta" data-reveal><p>You can begin the journey now with a quick picture of where your organisation stands today.</p><AssessmentAction>Start the 10–15 minute Maturity Snapshot</AssessmentAction></div>
    </section>

    <section className="sie-maturity" id="maturity">
      <SectionLead number="05" eyebrow="Social Impact Maturity Assessment" title={<>Before deciding where to go,<br />understand where you are.</>}><p>Every Social Impact Excellence journey begins by developing a structured picture of the organisation’s current maturity across the five pillars.</p><p>We express maturity as a simple one-to-five-star journey. It is developmental, not a pass or fail.</p></SectionLead>
      <div className="sie-maturity-scale" role="img" aria-label="A developmental maturity scale from one star, very early, to five stars, fully embedded" data-reveal>{["Very early", "Developing", "Partly established", "Strong", "Fully embedded"].map((level, index) => <div key={level}><span>{index + 1} {index === 0 ? "star" : "stars"}</span><div className="sie-stars" aria-hidden="true">{"★".repeat(index + 1)}{"☆".repeat(4 - index)}</div><strong>{level}</strong></div>)}</div>
      <div className="sie-maturity-reassurance" data-reveal><h3>You don’t have to be excellent already.</h3><div>{["What’s working?", "What’s missing?", "Where are the weak pillars?", "What should we prioritise next?"].map((question, index) => <p key={question}><span>0{index + 1}</span>{question}</p>)}</div></div>
      <div className="sie-inline-cta is-dark" data-reveal><p>Start where you are. The first step is designed to take about 10–15 minutes.</p><AssessmentAction>Start your Maturity Snapshot today</AssessmentAction></div>
      <div className="sie-profile" data-reveal><div><span>Illustrative maturity profile</span><p>A developmental five-star profile, not a pass, fail or league table. It creates a useful starting point for conversation and action.</p></div><div className="sie-profile-chart"><div className="sie-profile-axis" aria-hidden="true"><span>0</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5 stars</span></div><div className="sie-profile-bars">{[
        ["Purpose", 4.2], ["Leadership", 3.5], ["Data", 1.6], ["Delivery", 3.8], ["Communications", 3.1],
      ].map(([name, value]) => { const score = Number(value); const rounded = Math.round(score); return <div key={name}><span>{name}</span><i style={{ "--profile": `${score * 20}%` } as React.CSSProperties} /><b aria-label={`${score} out of 5 stars`}><span aria-hidden="true">{"★".repeat(rounded)}{"☆".repeat(5 - rounded)}</span><small>{score}/5</small></b></div>; })}</div></div></div>
      <div className="sie-data-note" data-reveal><span>Why Data is shown lowest</span><h3>Data is often still the challenge.</h3><div><p>Many organisations have a strong purpose and committed people, but struggle to collect, connect and use the evidence that shows what is actually changing.</p><p>That is why we have partnered with Fluid IT, a digital and IT consultancy, and why Gareth Murphy has become a core partner, bringing practical digital, data and systems expertise into the team.</p><Link href="/#team">Meet Gareth and the team <span aria-hidden="true">→</span></Link></div></div>
    </section>

    <section className="sie-platform" id="platform">
      <SectionLead number="06" eyebrow="The Social Impact Excellence Platform" title={<>We’ve made the first step easier.</>}><p>Serious methodology. Simple experience.</p><p>The platform guides organisations through the Maturity Assessment and turns responses into a useful picture of current maturity across the five pillars.</p></SectionLead>
      <div className="sie-platform-system" data-reveal><div className="sie-platform-questions"><span>Structured assessment</span>{["What are you trying to change?", "Who owns impact?", "What evidence can people use?", "How does delivery improve?", "Can your claims be trusted?"].map((question, index) => <p key={question}><b>0{index + 1}</b>{question}</p>)}</div><div className="sie-platform-output"><span>Useful output</span><strong>A clearer picture of where you are, and what deserves attention next.</strong><div>{pillars.map(pillar => <PillarIcon key={pillar.name} pillar={pillar} compact />)}</div></div></div>
      <div className="sie-inline-cta" data-reveal><p>The platform is ready when you are. Create your account and take the first step today.</p><AssessmentAction>Go to the Social Impact Excellence Platform</AssessmentAction></div>
      <div className="sie-human-tech" data-reveal><div><p>Technology and AI help us remove friction, analyse more information and work more efficiently.</p><p>Our role is to act as a critical friend: bringing perspective, challenging assumptions and helping organisations make better decisions.</p></div><div>{["Curiosity", "Creativity", "Critical thinking", "Judgement", "Asking the right questions"].map(item => <span key={item}>{item}</span>)}</div></div>
      <p className="sie-tech-line" data-reveal>The technology sits under the bonnet.<br /><strong>The thinking remains the point.</strong></p>
    </section>

    <section className="sie-real-world">
      <SectionLead eyebrow="Built for the real world" title={<>Same principles.<br />Proportionate application.</>}><p>We want serious social impact strategy to be accessible to every organisation. The methodology scales to the resources, complexity, ambition and scrutiny of the organisation using it.</p></SectionLead>
      <div className="sie-spectrum" data-reveal><article><span>Small / early-stage organisation</span>{["Simple systems", "Focused evidence", "Practical priorities", "Affordable support"].map(item => <p key={item}>{item}</p>)}</article><div><span>Proportionate</span><i aria-hidden="true">↔</i></div><article><span>Large / complex organisation</span>{["Deeper evidence", "Greater governance", "Sophisticated systems", "Broader accountability"].map(item => <p key={item}>{item}</p>)}</article></div>
      <p className="sie-ambition" data-reveal>The ambition doesn’t change.<br /><strong>The way we achieve it does.</strong></p>
      <div className="sie-audiences" data-reveal><span>For organisations that create, fund, invest in or influence impact.</span><div>{["Investors & funders", "B Corps", "Social enterprises", "NGOs & charities", "Corporates & brands"].map(item => <p key={item}>{item}</p>)}</div></div>
    </section>

    <section className="sie-continuous" id="get-started">
      <div className="sie-continuous-head" data-reveal><Eyebrow>Excellence is continuous</Eyebrow><h2>Excellence never really ends.</h2><div>{["Organisations change.", "Stakeholders change.", "Evidence improves.", "Expectations rise.", "New questions emerge."].map(item => <p key={item}>{item}</p>)}</div></div>
      <p className="sie-continuous-statement" data-reveal>Social Impact Excellence is continuous.</p>
      <div className="sie-loop" role="img" aria-label="Assess, understand, design, act, learn and assess again" data-reveal>{["Assess", "Understand", "Design", "Act", "Learn", "Assess again"].map((item, index) => <div key={item}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item}</strong>{index < 5 && <i aria-hidden="true">→</i>}</div>)}</div>
      <div className="sie-continuous-question" data-reveal><p>The maturity assessment isn’t merely the beginning. Over time it becomes a way of asking:</p><strong>Are we actually getting better?</strong></div>
      <div className="sie-final-cta" data-reveal><span>Start where you are.</span><h2>Your first step towards Social Impact Excellence is understanding where you are today.</h2><div><p>Start with the Social Impact Maturity Snapshot. It takes about 10–15 minutes to complete the first step.</p><ul><li>Understand your strengths.</li><li>Identify your gaps.</li><li>See where your weakest pillars are.</li><li>Decide what deserves attention next.</li></ul><AssessmentAction>Start your Maturity Snapshot today</AssessmentAction></div></div>
    </section>
  </main><Footer /></>;
}
