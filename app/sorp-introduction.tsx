import Image from "next/image";
import { SorpForwardLine } from "./sorp-forward-line";
import { SorpScopeIntro } from "./sorp-scope-intro";
import { SorpPublicMethodology } from "./sorp-public-methodology";
import "./sorp-introduction.css";
import "./sorp-welcome.css";

export const introductionScreens = ["scope", "public-methodology", "intro", "benefits"] as const;
export type IntroductionScreen = typeof introductionScreens[number];

function MarcusSignature({ methodology = false }: { methodology?: boolean }) {
  return <div className="si-signature">
    <Image src="/images/marcus-warry-msi.webp" alt="Marcus Warry" width={1122} height={1402} />
    <div>{methodology && <small>DEVELOPED BY</small>}<strong>Marcus Warry ACA</strong><span>{methodology ? "Chartered Accountant and social impact consultant" : "Co-founder, My Social Impact"}</span></div>
  </div>;
}

function Scope() {
  return <div className="si-welcome">
    <header className="si-welcome-heading">
      <p className="si-eyebrow">FREE SORP 2026</p>
      <h1>ARE YOU SORP READY?</h1>
      <p className="si-welcome-subtitle">Impact &amp; Sustainability Readiness Review</p>
    </header>
    <SorpForwardLine screen="scope" />
    <div className="si-welcome-promise">
      <p className="si-welcome-free"><strong>FREE TO USE.</strong> <strong>NO OBLIGATION.</strong></p>
      <p className="si-welcome-lead">This free tool helps you understand what your latest published reporting already demonstrates, then bring the picture up to date.</p>
      <p className="si-welcome-optional">At the end, we’ll ask whether you’d like My Social Impact to review the results with you. That is entirely optional.</p>
    </div>
    <p className="si-welcome-boundary">THIS IS NOT A FULL SORP 2026 COMPLIANCE REVIEW.</p>
    <details className="si-expander"><summary>WHAT DOES THIS REVIEW COVER? <span aria-hidden="true">+</span></summary><div className="si-expanded"><SorpScopeIntro /></div></details>
    <div className="si-welcome-signature">
      <Image src="/images/marcus-warry-msi.webp" alt="Marcus Warry" width={1122} height={1402} sizes="56px" />
      <div><small>DEVELOPED BY</small><strong>Marcus Warry ACA</strong><span>Chartered Accountant &amp; social impact consultant</span><span>Co-founder, My Social Impact</span></div>
    </div>
  </div>;
}

function Methodology() {
  return <>
    <header className="si-method-heading"><h1>SORP 2026 IS OUR<br /> SOURCE OF TRUTH.</h1><p className="si-lead">We assess your published Trustees’ Annual Report and accounts against a defined methodology mapped to SORP 2026.</p></header>
    <SorpForwardLine screen="public-methodology" />
    <div className="si-method-principles"><div className="si-question-count"><strong>19</strong><span>QUESTIONS.</span></div><ul><li>TIER-AWARE REQUIREMENTS.</li><li>PUBLISHED EVIDENCE.</li><li>FIXED SCORING.</li><li>HUMAN JUDGEMENT CLEARLY LABELLED.</li></ul></div>
    <div className="si-definitions" aria-label="Official SORP 2026 definitions"><section><h2>IMPACT</h2><blockquote>“Impact is the effect or influence that a charity has on its beneficiaries and wider society.”</blockquote></section><section><h2>SUSTAINABILITY REPORTING</h2><blockquote>“Sustainability Reporting is the practice of disclosing performance across environmental, social and governance areas, sometimes referred to as ESG.”</blockquote></section></div>
    <details className="si-expander"><summary>READ THE FULL METHODOLOGY <span aria-hidden="true">+</span></summary><div className="si-expanded"><MarcusSignature methodology /><SorpPublicMethodology expanded /></div></details>
  </>;
}

function Vision() {
  return <>
    <div className="si-vision-spread"><section className="si-vision"><p className="si-eyebrow">OUR VISION</p><h2>Imagine a world where social impact was taken as seriously as financial performance.</h2></section><section className="si-brand-story"><p className="si-eyebrow">WHY MY SOCIAL IMPACT BUILT THIS</p><h1>Beyond the<br />annual report.</h1><div className="si-philosophy">SORP IS THE REQUIREMENT.<br /><strong>BETTER IMPACT IS THE OPPORTUNITY.</strong></div><p>SORP 2026 raises the bar for reporting. We see an opportunity to understand what is working, where evidence is thin and what can improve.</p><p>Better reporting grows from better evidence, learning and decisions throughout the year.</p></section></div>
    <SorpForwardLine screen="intro" />
    <div className="si-expertise"><section><Image src="/assets/social-impact-excellence-transparent.png" alt="Social Impact Excellence" width={150} height={150} /><div><h2>SOCIAL IMPACT EXCELLENCE</h2><p>Manage impact throughout the year.</p><p>Purpose · Leadership · Data · Delivery · Communication</p></div></section><section><Image src="/assets/social-impact-claims-code-transparent.png" alt="Social Impact Claims Code" width={150} height={150} /><div><h2>SOCIAL IMPACT CLAIMS CODE</h2><p>Make claims your evidence can support.</p><p>Evidence · Proportion · Transparency · Balance · Learning</p></div></section></div>
    <details className="si-expander"><summary>MORE ABOUT MY SOCIAL IMPACT <span aria-hidden="true">+</span></summary><div className="si-expanded si-brand-detail"><section><h2>Social Impact Excellence</h2><p>Our flagship methodology treats social impact as a management discipline—not an annual reporting exercise. It connects five parts of an organisation:</p><dl><dt>Purpose</dt><dd>Be clear about the change you exist to create.</dd><dt>Leadership</dt><dd>Make impact part of governance, accountability and everyday decisions.</dd><dt>Data</dt><dd>Gather useful evidence and measure what matters.</dd><dt>Delivery</dt><dd>Turn purpose into programmes and services capable of meaningful change.</dd><dt>Communication</dt><dd>Tell the story clearly, credibly and transparently.</dd></dl><p>From a maturity assessment and diagnostic to a blueprint, practical roadmap and continuous improvement, the approach helps organisations act on what they learn.</p><a href="/social-impact-excellence" target="_blank" rel="noreferrer">EXPLORE SOCIAL IMPACT EXCELLENCE ↗</a></section><section><h2>Social Impact Claims Code</h2><p>A practical framework for measuring, interpreting and communicating impact responsibly. Its central discipline: make the strongest claim the evidence allows. No stronger.</p><dl><dt>Evidence</dt><dd>Know what supports the claim; distinguish activity, outputs, outcomes and impact.</dd><dt>Proportion</dt><dd>Do not turn contribution into causation or uncertainty into certainty.</dd><dt>Transparency</dt><dd>Show the sources, methods, assumptions and limitations.</dd><dt>Balance</dt><dd>Include what did not work and who did not benefit—not just the best story.</dd><dt>Learning</dt><dd>Use the evidence to decide what to keep, change, stop or test next.</dd></dl><a href="/social-impact-claims-code" target="_blank" rel="noreferrer">EXPLORE THE SOCIAL IMPACT CLAIMS CODE ↗</a></section></div></details>
  </>;
}

function Benefits() {
  return <div className="scr-benefits"><h1>WHAT YOU’LL GET FOR FREE</h1><div className="scr-benefits-journey"><SorpForwardLine screen="benefits" /><ol>{[
    ["YOUR HISTORICAL SNAPSHOT", "A review of your latest published Trustees’ Annual Report and accounts against SORP 2026."],
    ["YOUR CURRENT READINESS", "Bring the assessment up to date with your answers, comments and current knowledge."],
    ["YOUR PERSONALISED REPORT", "See your strengths, gaps and priorities in one clear report."],
  ].map(([title, description], index) => <li key={title}><span className="scr-benefit-number" aria-hidden="true">0{index + 1}</span><div><h2>{title}</h2><p>{description}</p></div></li>)}</ol></div>
    <section className="si-optional"><p className="si-eyebrow">OPTIONAL AFTERWARDS</p><div><h2>PROFESSIONAL REVIEW WITH MY SOCIAL IMPACT</h2><p>If you want to talk the results through with us, you can book a professional review at the end. There is no obligation.</p></div></section>
    <p className="scr-benefit-assurance">FREE REVIEW · PERSONALISED PDF · NO OBLIGATION</p>
  </div>;
}

export function SorpIntroduction({ screen }: { screen: IntroductionScreen }) {
  const index = introductionScreens.indexOf(screen);
  return <div className={`si-spread si-spread--${screen}`}>
    <div className="si-progress"><span>INTRODUCTION · {index + 1} OF 4</span><span className="si-progress-dots" aria-hidden="true">{introductionScreens.map((item, i) => <i key={item} className={i === index ? "is-active" : i < index ? "is-past" : ""} />)}</span></div>
    {screen === "scope" ? <Scope /> : screen === "public-methodology" ? <Methodology /> : screen === "intro" ? <Vision /> : <Benefits />}
  </div>;
}
