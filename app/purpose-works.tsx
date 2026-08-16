"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Footer, RevealObserver, SiteHeader } from "./site-shell";

const sections = [
  ["overview", "Overview"],
  ["trust", "Trust"],
  ["alignment", "Alignment"],
  ["offer", "What we do"],
  ["excellence", "Excellence"],
  ["experience", "Experience"],
  ["people", "People"],
  ["start", "Start"],
] as const;

const pillars = [
  ["01", "Purpose", "Where the organisation is going and why.", "primary"],
  ["02", "Leadership", "How purpose becomes accountable and embedded.", "support"],
  ["03", "Data", "The evidence that makes claims credible.", "evidence"],
  ["04", "Delivery", "The operational substance beneath the story.", "evidence"],
  ["05", "Communications", "How impact is understood, shared and trusted.", "primary"],
] as const;

const caseStudies = [
  {
    name: "Agri Evolve",
    discipline: "Social impact reporting",
    copy: "Led the development of Agri Evolve’s first Social Impact Report, translating field-level activity into a clear account of social and environmental impact.",
    result: "Strengthened stakeholder communication and impact credibility.",
  },
  {
    name: "Diageo",
    discipline: "Behaviour change strategy",
    copy: "Developed a student-led engagement campaign promoting responsible drinking and behavioural change across Europe.",
    result: "Reached over 14 million students across 14 countries.",
  },
  {
    name: "ActionAid",
    discipline: "Campaign strategy & accountability",
    copy: "Developed strategic communications that helped mobilise public engagement around fairness, accountability and systemic change.",
    result: "Built national visibility and public engagement.",
  },
] as const;

function PurposeWorksNavigation() {
  const [active, setActive] = useState("overview");

  useEffect(() => {
    const update = () => {
      const readingLine = window.innerHeight * 0.34;
      const reached = sections.filter(([id]) => {
        const element = document.getElementById(id);
        return element ? element.getBoundingClientRect().top <= readingLine : false;
      });
      setActive(reached.length ? reached[reached.length - 1][0] : "overview");
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  useEffect(() => {
    document.querySelector<HTMLAnchorElement>('.pw-subnav a[href="#' + active + '"]')?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [active]);

  return (
    <nav className="pw-subnav" aria-label="Purpose Works sections">
      <div>{sections.map(([id, label]) => <a key={id} className={active === id ? "is-active" : ""} href={"#" + id} aria-current={active === id ? "location" : undefined}>{label}</a>)}</div>
    </nav>
  );
}

function Marker({ number, children }: { number: string; children: React.ReactNode }) {
  return <p className="pw-marker"><span>{number}</span>{children}</p>;
}

export function PurposeWorksPage() {
  return (
    <>
      <RevealObserver />
      <SiteHeader />
      <PurposeWorksNavigation />
      <main className="pw-page">
        <section className="pw-hero" id="overview">
          <div className="pw-hero-meta" data-reveal>
            <span>A My Social Impact product</span>
            <span>Purpose · Impact · Communications</span>
          </div>
          <div className="pw-wordmark" data-reveal style={{ "--delay": "80ms" } as React.CSSProperties}>
            <Image src="/assets/purpose-works-wordmark.png" alt="Purpose Works" width={1942} height={809} priority unoptimized />
          </div>
          <div className="pw-hero-definition" data-reveal style={{ "--delay": "140ms" } as React.CSSProperties}>
            <h1>My Social Impact’s specialist purpose, social impact marketing and communications offer.</h1>
            <p>Helping organisations align what they say, what they do and what they stand for — and turn credible social impact into stronger stakeholder trust.</p>
          </div>
        </section>

        <section className="pw-intro pw-pad">
          <Marker number="01">Purpose should do more than appear in a brand statement.</Marker>
          <div className="pw-intro-grid" data-reveal>
            <h2>Purpose should work.</h2>
            <div>
              <p>It should influence strategy, leadership, decisions, behaviour, culture, operations and impact.</p>
              <p>Purpose Works connects the reality inside an organisation with the way it communicates outside it.</p>
            </div>
          </div>
          <div className="pw-intersection" aria-label="Purpose Works operates at the intersection of purpose, social impact, strategy, marketing, communications, stakeholder engagement, behavioural change and trust" data-reveal>
            {["Purpose", "Social impact", "Strategy", "Marketing", "Communications", "Stakeholder engagement", "Behavioural change", "Trust"].map((item, index) => <span key={item}><b>{String(index + 1).padStart(2, "0")}</b>{item}</span>)}
          </div>
        </section>

        <section className="pw-trust" id="trust">
          <Marker number="02">The big idea</Marker>
          <h2 data-reveal>Trust is becoming a strategic asset.</h2>
          <p className="pw-trust-lead" data-reveal>The organisations that win tomorrow will be the ones people trust.</p>
          <div className="pw-trust-grid" data-reveal>
            {[["Investment", "Confidence in what the organisation can deliver."], ["Recruitment", "A reason for talented people to choose you."], ["Reputation", "Credibility earned through consistent action."], ["Loyalty", "Relationships that endure beyond a transaction."], ["Partnerships", "A stronger basis for working together."], ["Long-term value", "Trust that compounds over time."]].map(([title, copy], index) => <article key={title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{copy}</p></article>)}
          </div>
          <div className="pw-boardroom" data-reveal>
            <strong>Trust is now a boardroom conversation.</strong>
            <p>Purpose, reputation, stakeholder alignment and organisational trust increasingly sit at leadership and board level. Purpose cannot belong only to a marketing department.</p>
          </div>
        </section>

        <section className="pw-alignment pw-pad" id="alignment">
          <Marker number="03">The alignment</Marker>
          <div className="pw-say-do" data-reveal>
            <div><span>01</span><strong>What they say</strong></div>
            <i aria-hidden="true">+</i>
            <div><span>02</span><strong>What they do</strong></div>
            <i aria-hidden="true">+</i>
            <div><span>03</span><strong>What they stand for</strong></div>
            <i aria-hidden="true">=</i>
            <div className="is-result"><span>04</span><strong>Trust</strong></div>
          </div>
          <div className="pw-alignment-copy" data-reveal>
            <div><h2>This is bigger than marketing.</h2><p>The strongest organisations connect communications to real stakeholder value, organisational credibility, measurable impact and operational reality.</p></div>
            <div><h2>Most organisations are strategically fragmented.</h2><p>Purpose, sustainability and communications often sit in silos. Purpose Works connects strategy, operations, culture, leadership, impact and communications into one coherent narrative.</p></div>
          </div>
          <div className="pw-credibility-line" data-reveal><span>Strategy</span><b>+</b><span>Evidence</span><b>+</b><span>Communication</span><b>=</b><strong>Credibility</strong></div>
        </section>

        <section className="pw-shift pw-pad">
          <Marker number="04">The market shift</Marker>
          <div className="pw-shift-head" data-reveal>
            <h2>From shareholder economics to stakeholder economics.</h2>
            <p>Organisations are increasingly judged on <strong>trust, responsibility and stakeholder value.</strong> Investors, regulators, employees, consumers and communities are pushing in the same broad direction.</p>
          </div>
          <div className="pw-economy" data-reveal>
            <span>The impact economy</span>
            <strong>$5tn+</strong>
            <p>The global impact economy is projected to double to over $5 trillion by 2030. Capital is increasingly flowing towards organisations able to demonstrate meaningful impact and responsible business practice.</p>
          </div>
          <div className="pw-regions" data-reveal><div><h3>Global thinking.</h3><p>International perspective for organisations competing in a world of rising stakeholder expectations.</p></div><div><h3>East African understanding.</h3><p>Regional experience across fast-growing markets — a differentiator, not a boundary. The UK remains the primary market.</p></div></div>
        </section>

        <section className="pw-offer pw-pad" id="offer">
          <Marker number="05">What Purpose Works actually does</Marker>
          <div className="pw-offer-title" data-reveal><h2>Connecting purpose, evidence and communications.</h2><p>Helping organisations align what they say, do and stand for through impact strategy, stakeholder engagement, behavioural change and credible communications.</p></div>
          <div className="pw-offer-grid">
            <article data-reveal>
              <span>01</span><h3>Strategy + purpose</h3><p>Helping organisations define what they stand for.</p>
              <ul>{["Purpose strategy", "Stakeholder mapping", "Impact positioning", "Behavioural change strategy", "Theory of Change thinking", "Impact readiness"].map(item => <li key={item}>{item}</li>)}</ul>
            </article>
            <article data-reveal style={{ "--delay": "90ms" } as React.CSSProperties}>
              <span>02</span><h3>Communication + engagement</h3><p>Turning purpose into stakeholder communications.</p>
              <ul>{["Behavioural change campaigns", "Social media campaigns", "Impact storytelling", "Stakeholder engagement", "Internal communications", "Impact reporting", "Responsible social impact messaging"].map(item => <li key={item}>{item}</li>)}</ul>
            </article>
          </div>
          <div className="pw-long-term" data-reveal><h3>From strategy to delivery.</h3><p>We help organisations define a credible purpose, embed it in leadership and decision-making, engage stakeholders, deliver communications and behavioural change campaigns, and report impact clearly.</p></div>
        </section>

        <section className="pw-excellence pw-pad" id="excellence">
          <Marker number="06">The My Social Impact connection</Marker>
          <div className="pw-excellence-head" data-reveal><h2>The five pillars create credibility.</h2><p>Purpose Works operates especially across <strong>Purpose + Communications</strong>, with Leadership helping embed purpose. Data + Delivery provide the evidence and operational substance that make communications credible.</p></div>
          <div className="pw-pillars" data-reveal>{pillars.map(([number, name, copy, role]) => <article className={"is-" + role} key={name}><span>{number}</span><h3>{name}</h3><p>{copy}</p><small>{role === "primary" ? "Purpose Works core" : role === "support" ? "Embedding purpose" : "Credibility underneath"}</small></article>)}</div>
          <div className="pw-management" data-reveal>
            <p>Imagine a world where social impact is taken as seriously as financial performance.</p>
            <div><strong>Measure</strong><i>→</i><strong>Manage</strong><i>→</i><strong>Communicate</strong></div>
            <small>Social impact as a management discipline. What gets measured, managed and led gets improved.</small>
          </div>
        </section>

        <section className="pw-gap pw-pad">
          <Marker number="07">The credibility gap</Marker>
          <h2 data-reveal>Most organisations have a gap.</h2>
          <div className="pw-gap-grid" data-reveal><article><span>Substance without story</span><p>Meaningful work that is communicated badly.</p></article><b>vs.</b><article><span>Story without substance</span><p>Brilliant communication without enough credibility underneath it.</p></article></div>
          <div className="pw-gap-answer" data-reveal><span>Purpose</span><i>+</i><span>Evidence</span><i>+</i><span>Communication</span><i>=</i><strong>Trust</strong></div>
        </section>

        <section className="pw-experience pw-pad" id="experience">
          <Marker number="08">Selected experience across the team</Marker>
          <div className="pw-experience-head" data-reveal><h2>Purpose Works is new. The expertise behind it is not.</h2><p>Experience across AgriEvolve, ActionAid, Harrods, Starbucks, Brewers Decorator Centres, JCWI, Diageo, Stroke Association, Ashima, Brook, Tonight Change, Family Planning Association and Traidcraft.</p></div>
          <div className="pw-case-grid">{caseStudies.map((item, index) => <article key={item.name} data-reveal style={{ "--delay": String(index * 75) + "ms" } as React.CSSProperties}><span>{String(index + 1).padStart(2, "0")}</span><p className="pw-case-discipline">{item.discipline}</p><h3>{item.name}</h3><p>{item.copy}</p><div><small>Result</small><strong>{item.result}</strong></div></article>)}</div>
          <div className="pw-behaviour" data-reveal><h3>Behavioural change is part of the work.</h3><p>We create campaigns designed to influence <strong>behaviour, culture and trust.</strong> Our experience includes responsible drinking, financial inclusion, sustainability, public engagement, health and social change.</p></div>
        </section>

        <section className="pw-people pw-pad" id="people">
          <Marker number="09">People</Marker>
          <div className="pw-people-grid">
            <article data-reveal><div className="pw-portrait"><Image src="/assets/marcus-final.jpg" alt="Marcus Warry" fill sizes="(max-width: 760px) 100vw, 50vw" unoptimized /></div><div><span>UK & Uganda</span><h2>Marcus Warry</h2><strong>Chartered Accountant<br />Social Impact Consultant</strong><p>Background in audit, finance, strategy and entrepreneurship. Works across the UK and East Africa helping organisations define, measure and scale their social impact.</p></div></article>
            <article data-reveal style={{ "--delay": "90ms" } as React.CSSProperties}><div className="pw-portrait"><Image src="/assets/chris-final.jpg" alt="Dr Chris Arnold" fill sizes="(max-width: 760px) 100vw, 50vw" unoptimized /></div><div><span>United Kingdom</span><h2>Dr Chris Arnold</h2><strong>Marketing Consultant<br />Creative Strategist</strong><p>Former board director at Saatchi & Saatchi. Brings deep expertise in brand, communications, behavioural change, ethical marketing and creative strategy.</p></div></article>
          </div>
          <p className="pw-founders">Marcus Warry and Dr Chris Arnold are co-founders of My Social Impact.</p>
        </section>

        <section className="pw-final" id="start">
          <Marker number="10">How we help</Marker>
          <div className="pw-start-grid" data-reveal><div><h2>Make purpose work across the organisation.</h2><p>We connect purpose to strategy, leadership, culture, operations, stakeholder relationships and the decisions people make every day.</p></div><div><h2>Communicate impact with credibility.</h2><p>We turn real evidence and operational substance into clear reporting, campaigns, engagement and stories that people can trust.</p></div></div>
          <div className="pw-closing" data-reveal>
            <p>The future belongs to trusted organisations.</p>
            <h2>Purpose works.</h2>
            <p>Purpose Works operates at the intersection of purpose, trust, impact, strategy and communications.</p>
            <a href="mailto:marcus@mysocialimpact.org?subject=Purpose%20Works">Start a conversation <span>↗</span></a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
