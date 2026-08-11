"use client";

import { useEffect, useState } from "react";
import { Footer, RevealObserver, SiteHeader } from "./site-shell";

const codeSections = [
  ["why-it-matters", "Why it matters"],
  ["trust", "Trust"],
  ["the-code", "The code"],
  ["applying-the-code", "Applying the code"],
  ["standards", "Standards"],
  ["our-approach", "Our approach"],
  ["verification", "Verification"],
  ["ai", "AI"],
  ["open-impact", "Open impact"],
  ["help-shape-it", "Help shape it"],
] as const;

const fiveFoundations = [
  ["Truth", "Say what the evidence genuinely supports."],
  ["Integrity", "Apply the same standards when the evidence is inconvenient."],
  ["Honesty", "Be clear about uncertainty, failure and what you do not know."],
  ["Fairness", "Represent different experiences and credible interpretations properly."],
  ["Accountability", "Be willing to explain and stand behind the claims you make."],
] as const;

const trustAudiences = [
  ["Donors", "Did my money actually make a difference?"],
  ["Customers", "Is this organisation’s impact claim real?"],
  ["Funders & investors", "What difference did our funding help create?"],
  ["Trustees & boards", "Are we achieving our purpose?"],
  ["Employees", "Does this organisation live up to what it says?"],
  ["Communities & beneficiaries", "Is our experience being represented fairly?"],
] as const;

type ClaimPrinciple = {
  number: string;
  name: string;
  statement: string;
  questions: readonly string[];
  copy: string;
  close: string;
  visual?: readonly string[];
};

const principles: readonly ClaimPrinciple[] = [
  {
    number: "01",
    name: "Evidence",
    statement: "Know what supports the claim.",
    questions: ["What happened?", "What changed?", "How do we know?"],
    copy: "Distinguish clearly between activity, output, outcome and impact. Consider what might have happened anyway. Use evidence appropriate to the significance and strength of the claim.",
    close: "Stronger claims require stronger evidence.",
    visual: ["Activity", "Output", "Outcome", "Impact"],
  },
  {
    number: "02",
    name: "Proportion",
    statement: "Make the strongest claim the evidence allows. No stronger.",
    questions: ["Do not turn activity into impact.", "Do not turn output into outcome.", "Do not turn contribution into causation.", "Do not turn uncertainty into certainty."],
    copy: "And do not demand academic-level evaluation where it isn’t necessary.",
    close: "The evidence and the claim should match.",
  },
  {
    number: "03",
    name: "Transparency",
    statement: "Show your workings.",
    questions: [],
    copy: "A reader should be able to understand where an important claim came from and why the organisation believes it is reasonable.",
    close: "Trust grows when claims can be scrutinised.",
    visual: ["Claim", "Evidence", "Method", "Assumptions", "Limitations"],
  },
  {
    number: "04",
    name: "Balance",
    statement: "Tell the whole story, not just the best story.",
    questions: ["What worked?", "What didn’t?", "Who benefited?", "Who didn’t?", "Were there unintended consequences?", "Could the evidence be interpreted differently?"],
    copy: "Represent credible differences in experience and interpretation, including evidence that points in another direction.",
    close: "Evidence does not become less important when it is inconvenient.",
  },
  {
    number: "05",
    name: "Learning",
    statement: "Impact evidence should change what you do.",
    questions: [],
    copy: "The purpose of measuring impact is not simply to prove that an organisation succeeded. It is to become better at creating change. Something that did not work is not necessarily a failure of impact practice.",
    close: "Refusing to learn from it might be.",
    visual: ["Keep", "Change", "Stop", "Test", "Learn again"],
  },
];

function CodeNavigation() {
  const [active, setActive] = useState("why-it-matters");

  useEffect(() => {
    const update = () => {
      const readingLine = window.innerHeight * 0.34;
      const reached = codeSections.filter(([id]) => {
        const element = document.getElementById(id);
        return element ? element.getBoundingClientRect().top <= readingLine : false;
      });
      setActive(reached.length ? reached[reached.length - 1][0] : "why-it-matters");
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  useEffect(() => {
    document.querySelector<HTMLAnchorElement>(`.sic-subnav a[href="#${active}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [active]);

  return (
    <nav className="sic-subnav" aria-label="Social Impact Claims Code sections">
      <div>{codeSections.map(([id, label]) => <a key={id} className={active === id ? "is-active" : ""} href={`#${id}`} aria-current={active === id ? "location" : undefined}>{label}</a>)}</div>
    </nav>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="sic-eyebrow"><span aria-hidden="true" />{children}</p>;
}

function Statement({ children, inverse = false }: { children: React.ReactNode; inverse?: boolean }) {
  return <div className={`sic-statement ${inverse ? "is-inverse" : ""}`} data-reveal><p>{children}</p></div>;
}

function Flow({ items, label }: { items: readonly string[]; label: string }) {
  return <div className="sic-flow" role="img" aria-label={`${label}: ${items.join(" to ")}`}>{items.map((item, index) => <div key={item}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item}</strong>{index < items.length - 1 && <i aria-hidden="true">→</i>}</div>)}</div>;
}

function ContactAction({ code = false }: { code?: boolean }) {
  const href = code ? "mailto:chris@mysocialimpact.org?subject=Social%20Impact%20Claims%20Code" : "mailto:marcus@mysocialimpact.org?subject=Social%20impact";
  return <a className="sic-action" href={href}>{code ? "Help shape the Code" : "Talk to us about your impact"}<span>→</span></a>;
}

export function SocialImpactClaimsCodePage() {
  return <><RevealObserver /><SiteHeader /><CodeNavigation /><main className="sic-page">
    <section className="sic-hero" id="why-it-matters">
      <div className="sic-hero-copy" data-reveal>
        <Eyebrow>Social Impact Claims Code</Eyebrow>
        <h1>If you say you’re making a difference, people should be able to trust what you say.</h1>
        <div className="sic-hero-support"><p>The Social Impact Claims Code is a practical, principle-based framework for measuring, interpreting and communicating social and environmental impact responsibly.</p><p>It is for charities, businesses, social enterprises, funders, advisers and anyone making claims about the difference they create.</p></div>
      </div>
      <div className="sic-central" data-reveal><span>The central principle</span><strong>Make the strongest claim the evidence allows.<br />No stronger.</strong></div>
      <div className="sic-hero-actions" data-reveal><a href="#the-code">Explore the Code <span>↓</span></a><a href="#help-shape-it">Help shape the Code <span>↓</span></a><p>The Code is being developed openly by My Social Impact. We welcome challenge, scrutiny and contributions from people working across social impact and beyond.</p></div>
    </section>

    <section className="sic-foundations" id="trust">
      <div className="sic-section-lead" data-reveal><Eyebrow>Enduring foundations</Eyebrow><h2>Some things should not move.</h2><div><p>Methods change. Technology changes. Reporting standards change. Evidence improves.</p><p>AI will transform how information is collected, analysed and communicated.</p><p>But the foundations of trustworthy claims are more fundamental.</p></div></div>
      <div className="sic-foundation-grid" data-reveal>{fiveFoundations.map(([name, copy], index) => <article key={name}><span>0{index + 1}</span><h3>{name}</h3><p>{copy}</p></article>)}</div>
      <div className="sic-three-lines" data-reveal><p>Truth does not become outdated because AI gets better.</p><p>Integrity does not become optional because a reporting standard changes.</p><p>Honesty about uncertainty should still matter in 20 years.</p></div>
      <div className="sic-evolving" data-reveal><h3>Enduring principles.<br />Evolving practice.</h3><div><p>How AI is used will change. How verification works will change. New methodologies will emerge. Expectations around data sharing and disclosure will develop.</p><p>The foundations should endure. Their application should improve as we learn.</p></div></div>
    </section>

    <section className="sic-claim-problem" id="the-code">
      <div className="sic-section-lead" data-reveal><Eyebrow>The claim problem</Eyebrow><h2>Anyone can make an impact claim. Why should anyone believe it?</h2></div>
      <div className="sic-claim-ladder" data-reveal>
        <article><span>Activity / output</span><p>“We worked with 5,000 people.”</p></article>
        <i aria-hidden="true">↓</i>
        <article><span>Outcome</span><p>“People’s lives improved.”</p></article>
        <i aria-hidden="true">↓</i>
        <article><span>Causal impact claim</span><p>“Our programme caused that improvement.”</p></article>
      </div>
      <Statement inverse>The stronger the claim, the stronger the evidence should be.</Statement>
    </section>

    <section className="sic-trust">
      <div className="sic-section-lead" data-reveal><Eyebrow>Trust</Eyebrow><h2>Impact reporting is ultimately about trust.</h2></div>
      <div className="sic-trust-grid" data-reveal>{trustAudiences.map(([name, question], index) => <article key={name}><span>0{index + 1}</span><h3>{name}</h3><p>{question}</p></article>)}</div>
      <Statement>Trust is not created by making a claim sound more convincing.<br /><em>It is earned by showing why the claim deserves to be believed.</em></Statement>
    </section>

    <section className="sic-definition">
      <div className="sic-definition-copy" data-reveal><Eyebrow>What is social impact?</Eyebrow><h2>What do we mean by social impact?</h2><div><p>We define social impact as a meaningful change in people’s lives, communities or society that results, at least in part, from an organisation’s actions.</p><p>For organisations seeking positive impact, the aim is not simply to create activity. It is to create meaningful positive change that lasts and can itself be sustained.</p><p>The same underlying principles can be applied to environmental impact.</p></div></div>
      <Flow label="From activity to a responsible claim" items={["What did we do? — Activities & outputs", "What changed? — Outcomes & wider effects", "What can we claim? — A reasonable interpretation of the evidence"]} />
    </section>

    <section className="sic-proportion">
      <div className="sic-section-lead" data-reveal><Eyebrow>Proportionality</Eyebrow><h2>Rigorous does not have to mean complicated.</h2><div><p>A small community organisation should not need a university research department before it can talk honestly about its impact.</p><p>The appropriate level of evidence depends on the organisation, its resources, the importance of the claim and how strong that claim is.</p></div></div>
      <div className="sic-levels" data-reveal>
        <article><span>01 · Small organisation</span><h3>A few pages may be enough.</h3><ul><li>Clear evidence.</li><li>Modest claims.</li><li>Honest limitations.</li></ul></article>
        <article><span>02 · Growing organisation</span><h3>More evidence may be appropriate.</h3><ul><li>Outcome measurement.</li><li>Stakeholder feedback.</li><li>Better comparison.</li></ul></article>
        <article><span>03 · Major claim</span><h3>Strong claims need stronger evidence.</h3><ul><li>More robust evaluation.</li><li>Counterfactual thinking.</li><li>Potential independent verification.</li></ul></article>
      </div>
      <div className="sic-proportion-note" data-reveal><strong>Proportionality means doing enough to justify the claim, not creating bureaucracy for its own sake.</strong><div><p>My Social Impact works with smaller organisations at affordable and proportionate levels too.</p><p>Sometimes a clear three or four-page Impact Report is entirely appropriate. Our job is to understand what evidence exists, apply professional judgement and help an organisation communicate what it can reasonably say.</p><ContactAction /></div></div>
    </section>

    <section className="sic-principles">
      <div className="sic-principles-intro" data-reveal><Eyebrow>The Code</Eyebrow><h2>Five principles for trustworthy impact claims.</h2><p>Evidence is the beginning. Proportion, transparency, balance and learning turn it into a claim that deserves trust.</p></div>
      <div className="sic-principle-list">{principles.map((principle) => <article className="sic-principle" key={principle.name} data-reveal>
        <header><span>{principle.number}</span><p>{principle.name}</p><h3>{principle.statement}</h3></header>
        <div className="sic-principle-body">
          {principle.visual && <Flow label={`${principle.name} sequence`} items={principle.visual} />}
          {principle.questions.length > 0 && <ul>{principle.questions.map((question) => <li key={question}>{question}</li>)}</ul>}
          <p>{principle.copy}</p><strong>{principle.close}</strong>
        </div>
      </article>)}</div>
    </section>

    <section className="sic-check" id="applying-the-code">
      <div className="sic-section-lead" data-reveal><Eyebrow>The claim check</Eyebrow><h2>Before publishing an impact claim, ask:</h2></div>
      <ol className="sic-checklist" data-reveal>{[
        "What exactly are we claiming?", "Is this an activity, output, outcome or impact?", "What evidence supports it?", "How strong is that evidence?", "Are we claiming contribution or causation?", "What might have happened anyway?", "What evidence points the other way?", "Did different groups experience different outcomes?", "Were there unintended positive or negative consequences?", "What don’t we know?",
      ].map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, "0")}</span>{item}</li>)}</ol>
      <Statement>If somebody challenged this claim, could we show them why it is reasonable?</Statement>
    </section>

    <section className="sic-standards" id="standards">
      <div className="sic-section-lead" data-reveal><Eyebrow>Principles vs rules</Eyebrow><h2>Principles, not 300 pages of rules.</h2><p>There are already many reporting standards, regulations and methodologies. The Code does not try to replace them. It sits underneath them.</p></div>
      <div className="sic-standards-grid" data-reveal><article><span>Reporting & regulation</span>{["Charities SORP", "CSRD / ESRS", "UK climate and sustainability requirements", "SECR", "Modern Slavery reporting", "Gender Pay Gap reporting", "Other statutory requirements"].map(item => <p key={item}>{item}</p>)}</article><article><span>Standards, frameworks & voluntary approaches</span>{["GRI", "ISSB / IFRS S1 & S2", "TNFD", "GHG Protocol", "SBTi", "UN Sustainable Development Goals", "Social Value / SROI", "B Corp"].map(item => <p key={item}>{item}</p>)}</article></div>
      <div className="sic-underneath" data-reveal><p>The Social Impact Claims Code does not try to replace them.</p><strong>It sits underneath them.</strong></div>
      <div className="sic-question-compare" data-reveal><article><span>Standards and regulations may ask</span><h3>What do we need to report?</h3></article><i>versus</i><article><span>The Social Impact Claims Code asks</span><h3>What can we responsibly say?</h3></article></div>
      <Statement>Standards tell you what to report.<br /><em>Principles help you decide what you can responsibly say.</em></Statement>
      <div className="sic-have-to" data-reveal><div className="sic-have-head"><h2>Some things you have to do. Others you choose to do.</h2><p>Requirements depend on organisation, sector, size and jurisdiction.</p></div><div className="sic-have-columns"><article><span>You may have to do</span>{["Financial reporting", "Charity reporting", "Carbon and energy reporting", "Statutory sustainability disclosures", "Modern Slavery reporting", "Gender Pay Gap reporting", "Other regulatory disclosures"].map(item => <p key={item}>{item}</p>)}</article><article><span>You may choose to do</span>{["B Corp", "Voluntary Impact Reports", "Social Value / SROI", "GRI", "Science-based targets", "Independent impact evaluation", "Impact verification", "Social Impact Claims Code"].map(item => <p key={item}>{item}</p>)}</article></div><div className="sic-compliance"><p><span>Compliance asks</span>What are we required to report?</p><p><span>Purpose asks</span>What do we want people to be able to trust us to say?</p></div></div>
    </section>

    <section className="sic-use-code" id="our-approach">
      <div className="sic-section-lead" data-reveal><Eyebrow>How we use the Code</Eyebrow><h2>If we put our name to an impact claim, these are the principles we expect ourselves to follow.</h2><p>The Code is not simply something we think other organisations should follow. We are already applying it to our own work.</p></div>
      <div className="sic-commitments" data-reveal>{[
        ["We don’t invent impact", "We work from the evidence available."],
        ["We don’t overclaim", "We distinguish between what is known, what can reasonably be inferred and what remains uncertain."],
        ["We don’t hide important limitations", "Credibility matters more than making every result appear positive."],
        ["We use professional judgement", "No methodology can eliminate judgement entirely. The important thing is that judgement is exercised responsibly and transparently."],
      ].map(([title, copy], index) => <article key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{copy}</p></article>)}</div>
      <div className="sic-use-close" data-reveal><p>My Social Impact works with organisations that want to make a positive change.</p><p>We help them understand that change, strengthen the evidence behind it and communicate it responsibly.</p><ContactAction /></div>
    </section>

    <section className="sic-disciplines">
      <article className="sic-discipline sic-accounting" data-reveal><Eyebrow>Social Impact Accounting</Eyebrow><h2>Impact deserves professional judgement too.</h2><div className="sic-discipline-copy"><p>Financial accounting developed disciplines for recording, interpreting and communicating financial performance.</p><p>We believe some of that thinking can strengthen how organisations understand social and environmental performance too. Not because every human outcome should be converted into money.</p><p>But because important claims deserve:</p></div><div className="sic-wordline">{["Evidence", "Consistency", "Judgement", "Transparency", "Accountability", "Trust"].map(item => <span key={item}>{item}</span>)}</div><p>Marcus Warry, co-founder of My Social Impact, is a Chartered Accountant. We are working with other accountants, impact practitioners and organisations to explore what a stronger discipline of Social Impact Accounting could look like.</p><strong>If financial claims require discipline, why shouldn’t important impact claims?</strong></article>
      <article className="sic-discipline sic-marketing" data-reveal><Eyebrow>Social Impact Marketing</Eyebrow><h2>Communicate the impact. Don’t inflate it.</h2><div className="sic-discipline-copy"><p>Evidence needs to be understood. Stories matter. Communication matters. Emotion matters. Behavioural change matters.</p><p>But powerful communication should not require exaggerated claims.</p><p>Dr Chris Arnold, co-founder of My Social Impact and a former board director at Saatchi & Saatchi, has extensive experience in ethical marketing, social impact marketing, communications and behavioural change.</p><p>This brings another discipline to the Code: how to communicate evidence in ways that are engaging and effective without making the claim bigger than the truth.</p></div><div className="sic-dual-discipline"><p><span>Social Impact Accounting</span>Can we substantiate it?</p><i>+</i><p><span>Social Impact Marketing</span>Can we communicate it responsibly and effectively?</p></div><Flow label="Responsible impact communication" items={["Evidence", "Meaning", "Communication", "Action"]} /><strong>Responsible impact communication should make the truth understandable and engaging, not make the claim bigger than the truth.</strong></article>
      <article className="sic-discipline sic-excellence" data-reveal><Eyebrow>Social Impact Excellence</Eyebrow><h2>Social impact should be treated as a management discipline.</h2><div className="sic-discipline-copy"><p>Impact should not live in an annual report. It should influence how an organisation is run.</p><p>Our Social Impact Excellence Framework looks at impact across five connected pillars.</p></div><Flow label="The five pillars of Social Impact Excellence" items={["Purpose", "Leadership", "Data", "Delivery", "Communication"]} /><div className="sic-pillar-notes">{[["Purpose", "Why are we trying to create change?"], ["Leadership", "Who owns it and how is it led?"], ["Data", "How do we know what is happening?"], ["Delivery", "How do we turn intention into results?"], ["Communication", "How do we explain the difference responsibly?"]].map(([title, copy]) => <p key={title}><span>{title}</span>{copy}</p>)}</div><p>The Claims Code sits particularly strongly across Data and Communication, while its principles of integrity, evidence, judgement and accountability run through all five.</p></article>
    </section>

    <section className="sic-verification" id="verification">
      <div className="sic-section-lead" data-reveal><Eyebrow>Verification</Eyebrow><h2>What if someone independent had actually checked the claim?</h2><p>Financial information can be independently examined. We are exploring how credible third-party review could work for social impact claims too.</p></div>
      <div className="sic-in-development" data-reveal><span>In development</span><Flow label="A possible future verification process" items={["Organisation makes an impact claim", "Evidence reviewed", "Methodology examined", "Assumptions challenged", "Limitations considered", "Professional judgement", "Verified"]} /></div>
      <div className="sic-verification-copy" data-reveal><p>We are exploring whether this could eventually support a recognisable mark showing that an Impact Report or important impact claim has been independently reviewed against transparent principles.</p><p><strong>This is an idea being developed.</strong> It is not an existing certification, accreditation or assurance standard.</p></div>
      <Statement inverse>In the age of AI, knowing that a trusted professional has actually examined the evidence may become more valuable, not less.</Statement>
    </section>

    <section className="sic-ai" id="ai">
      <div className="sic-section-lead" data-reveal><Eyebrow>AI & agents</Eyebrow><h2>When convincing claims become cheap, trust becomes more valuable.</h2><div><p>AI is making it easier to collect information, analyse data, identify patterns and produce polished reports. Agents will increasingly perform parts of that process themselves.</p><p>That creates enormous opportunities. It also creates a problem.</p></div></div>
      <Statement>Producing a convincing claim and establishing whether it deserves to be believed are not the same thing.</Statement>
      <div className="sic-ai-grid" data-reveal><article><span>AI can help</span>{["Collect data", "Analyse evidence", "Identify patterns", "Draft communications"].map(item => <p key={item}>{item}</p>)}</article><article><span>AI can also</span>{["Repeat poor assumptions", "Hide uncertainty", "Overstate conclusions", "Make weak evidence sound compelling"].map(item => <p key={item}>{item}</p>)}</article><article><span>Humans still decide</span>{["What evidence to trust", "What claim is justified", "What remains uncertain", "What to delegate"].map(item => <p key={item}>{item}</p>)}</article></div>
      <div className="sic-ai-human" data-reveal><p>AI can increasingly perform analysis and actions.</p><strong>Humans still need to decide what evidence is trustworthy, what claims are justified and what they are willing to delegate.</strong></div>
      <Statement inverse>As technology becomes more capable, principles become more important, not less.</Statement>
      <p className="sic-small-copy">In time, the Social Impact Claims Code could provide useful principles not only for people, but for AI systems and agents increasingly involved in measuring and communicating impact.</p>
    </section>

    <section className="sic-open" id="open-impact">
      <div className="sic-section-lead" data-reveal><Eyebrow>Open impact</Eyebrow><h2>What if organisations learned from impact the way science learns from evidence?</h2><div><p>Thousands of organisations are tackling poverty, health, education, inequality, environmental degradation and other difficult problems. Every day they learn things.</p><p>Too often those lessons remain trapped inside organisations, spreadsheets, funding applications and reports.</p><p>Scientific knowledge advances partly because evidence is shared, methods are scrutinised, findings are challenged and other people build on what has already been learned.</p></div></div>
      <Flow label="The open impact learning loop" items={["Measure", "Share", "Challenge", "Learn", "Improve", "Share again"]} />
      <div className="sic-open-copy" data-reveal><p>Not every piece of impact data can or should be public. Privacy, safeguarding, confidentiality, data protection and commercial considerations matter.</p><p>But where useful knowledge can responsibly be shared, there is enormous potential.</p></div>
      <Statement>If organisations learn from each other faster, we may become better at solving difficult problems faster.</Statement>
    </section>

    <section className="sic-evolve">
      <div className="sic-section-lead" data-reveal><Eyebrow>Evolving practice</Eyebrow><h2>Enduring principles. Evolving practice.</h2><p>The Social Impact Claims Code should be stable enough for people to rely upon. But it should not pretend that every question has already been answered.</p></div>
      <div className="sic-enduring" data-reveal><strong>Truth · Integrity · Honesty · Fairness · Accountability</strong><p>These foundations are intended to endure.</p></div>
      <div className="sic-new-grid" data-reveal>{["New evidence", "New methodologies", "New technology", "New forms of verification", "New expectations", "New questions created by AI and agents"].map((item, index) => <span key={item}><b>0{index + 1}</b>{item}</span>)}</div>
      <Statement inverse>The foundations of the Code should endure.<br /><em>Its application should improve as we learn.</em></Statement>
      <p className="sic-small-copy">Being open to challenge does not make a principle-based framework weaker. It is how good principles survive contact with the real world.</p>
    </section>

    <section className="sic-shape" id="help-shape-it">
      <div className="sic-shape-intro" data-reveal><Eyebrow>Help shape it</Eyebrow><h2>We started the Code. We don’t think we should finish it alone.</h2><h3>Help shape the Social Impact Claims Code.</h3><div><p>My Social Impact has initiated this work. We do not claim to be the sole authority on good impact practice.</p><p>We want the Code to be challenged, tested and improved by people with different expertise and experience.</p></div></div>
      <div className="sic-contributors" data-reveal><p>We’d particularly like to hear from:</p><div>{["Charities", "Businesses", "Social enterprises", "Accountants", "Funders", "Researchers", "Evaluators", "Trustees", "Impact practitioners", "Marketers", "Communicators", "People with lived experience"].map(item => <span key={item}>{item}</span>)}</div></div>
      <div className="sic-challenge-us" data-reveal>{["Challenge it.", "Tell us what we’ve missed.", "Tell us where you disagree.", "Give us examples that test the principles.", "Help us make it better."].map((item, index) => <p key={item}><span>0{index + 1}</span>{item}</p>)}</div>
      <div className="sic-shape-contact" data-reveal><div><p>If you work in this field and would be willing to be interviewed or contribute your perspective, we’d love to hear from you.</p><a href="mailto:chris@mysocialimpact.org?subject=Social%20Impact%20Claims%20Code">chris@mysocialimpact.org ↗</a><ContactAction code /></div><p>Chris & Marcus<br /><strong>My Social Impact</strong></p></div>
    </section>

    <section className="sic-final" aria-label="The central principle"><p data-reveal>Make the strongest claim the evidence allows.</p><strong data-reveal>No stronger.</strong></section>
  </main><Footer /></>;
}
