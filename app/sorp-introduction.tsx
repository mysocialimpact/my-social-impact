import Image from "next/image";
import { SorpScopeIntro } from "./sorp-scope-intro";
import { SorpPublicMethodology } from "./sorp-public-methodology";
import "./sorp-introduction.css";

export const introductionScreens = ["scope", "public-methodology", "intro", "benefits"] as const;
export type IntroductionScreen = typeof introductionScreens[number];

function MarcusSignature({ methodology = false }: { methodology?: boolean }) {
  return <div className="si-signature">
    <Image src="/images/marcus-warry-msi.webp" alt="Marcus Warry" width={1122} height={1402} />
    <div>{methodology && <small>DEVELOPED BY</small>}<strong>Marcus Warry ACA</strong><span>{methodology ? "Chartered Accountant and social impact consultant" : "Co-founder, My Social Impact"}</span></div>
  </div>;
}

function ImpactSignal() {
  return <div className="si-impact-signal" aria-hidden="true"><svg viewBox="0 0 360 220" fill="none" focusable="false">
    <path className="scr-impact-grid" d="M12 44V192H148 M12 148H130 M12 104H130 M12 60H130 M48 44V192 M84 44V192 M120 44V192" />
    <path className="scr-impact-signal" d="M12 170H40V151H69V157H97V119H125V130L158 105" />
    <g className="scr-impact-network"><path d="M158 105L213 40L278 66L333 33 M158 105L241 111L328 151 M158 105L202 179L277 192L328 151 M213 40L241 111L202 179 M278 66L241 111L277 192 M278 66L328 151 M333 33L328 151" /></g>
    <path className="scr-impact-flow" pathLength="100" d="M12 170H40V151H69V157H97V119H125V130L158 105L213 40L278 66L333 33" />
    <path className="scr-impact-flow scr-impact-flow--second" pathLength="100" d="M158 105L241 111L328 151L277 192L202 179L158 105" />
    {[[158,105],[213,40],[278,66],[333,33],[241,111],[328,151],[202,179],[277,192]].map(([x,y],i) => <g key={x} className="scr-impact-point" style={{ animationDelay: `${i * -.45}s` }}><circle className="scr-impact-aura" cx={x} cy={y} r={i === 0 ? 17 : 11} /><circle className="scr-impact-dot" cx={x} cy={y} r={i === 0 ? 5 : 3.5} /></g>)}
  </svg></div>;
}

function Scope() {
  return <>
    <header className="si-scope-heading"><p className="si-eyebrow">FREE SORP 2026</p><h1>ARE YOU SORP READY?</h1><p className="si-proposition">IMPACT &amp; SUSTAINABILITY READINESS REVIEW</p></header>
    <div className="si-scope-promise"><p className="si-lead">This free tool helps you understand how ready your charity is for the impact and sustainability reporting elements of SORP 2026.</p><div className="si-free"><strong>FREE TO USE.<br /> NO OBLIGATION.</strong><p>At the end, we’ll ask whether you’d like My Social Impact to review the results with you. That is entirely optional.</p></div></div>
    <p className="si-boundary">THIS IS NOT A FULL SORP 2026 COMPLIANCE REVIEW.</p>
    <div className="si-scope-summary"><section><h2>WHAT THIS CHECKS</h2><ul>{["purpose and aims", "achievements and performance", "outputs, outcomes and impact", "evidence and learning", "sustainability reporting"].map(text => <li key={text}>{text}</li>)}</ul></section><section><h2>WHAT THIS DOES NOT CHECK</h2><ul>{["full financial statement requirements", "all accounting disclosures", "every governance / administrative requirement", "specialist SORP modules"].map(text => <li key={text}>{text}</li>)}</ul></section></div>
    <details className="si-expander"><summary>WHAT EXACTLY DOES THIS COVER? <span aria-hidden="true">+</span></summary><div className="si-expanded"><SorpScopeIntro /></div></details>
    <MarcusSignature />
  </>;
}

function Methodology() {
  return <>
    <header className="si-method-heading"><h1>SORP 2026 IS OUR<br /> SOURCE OF TRUTH.</h1><p className="si-lead">We assess your published Trustees’ Annual Report and accounts against a defined methodology mapped to SORP 2026.</p></header>
    <div className="si-method-principles"><div className="si-question-count"><strong>19</strong><span>QUESTIONS.</span></div><ul><li>TIER-AWARE REQUIREMENTS.</li><li>PUBLISHED EVIDENCE.</li><li>FIXED SCORING.</li><li>HUMAN JUDGEMENT CLEARLY LABELLED.</li></ul></div>
    <div className="si-definitions" aria-label="Official SORP 2026 definitions"><section><h2>IMPACT</h2><blockquote>“Impact is the effect or influence that a charity has on its beneficiaries and wider society.”</blockquote></section><section><h2>SUSTAINABILITY REPORTING</h2><blockquote>“Sustainability Reporting is the practice of disclosing performance across environmental, social and governance areas, sometimes referred to as ESG.”</blockquote></section></div>
    <MarcusSignature methodology />
    <details className="si-expander"><summary>READ THE FULL METHODOLOGY <span aria-hidden="true">+</span></summary><div className="si-expanded"><SorpPublicMethodology expanded /></div></details>
  </>;
}

function Vision() {
  return <>
    <div className="si-vision-spread"><section className="si-vision"><p className="si-eyebrow">OUR VISION</p><h2>Imagine a world where social impact was taken as seriously as financial performance.</h2><ImpactSignal /></section><section className="si-brand-story"><p className="si-eyebrow">WHY MY SOCIAL IMPACT BUILT THIS</p><h1>Beyond the<br />annual report.</h1><div className="si-philosophy">SORP IS THE REQUIREMENT.<br /><strong>BETTER IMPACT IS THE OPPORTUNITY.</strong></div><p>SORP 2026 raises the bar for reporting. We see an opportunity to understand what is working, where evidence is thin and what can improve.</p><p>Better reporting grows from better evidence, learning and decisions throughout the year.</p></section></div>
    <div className="si-expertise"><section><h2>SOCIAL IMPACT EXCELLENCE</h2><p>Purpose · Leadership · Data · Delivery · Communication</p></section><section><h2>SOCIAL IMPACT CLAIMS CODE</h2><p>Evidence · Proportion · Transparency · Balance · Learning</p></section></div>
    <details className="si-expander"><summary>MORE ABOUT MY SOCIAL IMPACT <span aria-hidden="true">+</span></summary><div className="si-expanded si-brand-detail"><p>That is the thinking behind our Social Impact Excellence approach, across Purpose, Leadership, Data, Delivery and Communication. Our Social Impact Claims Code helps keep the resulting claims proportionate and credible.</p><p>My Social Impact specialises in helping organisations understand, evidence, improve and communicate the difference they make.</p></div></details>
  </>;
}

function Benefits() {
  return <div className="scr-benefits"><h1>WHAT YOU’LL GET FOR FREE</h1><div className="scr-benefits-journey"><svg className="scr-benefits-connection" viewBox="0 0 1000 220" preserveAspectRatio="none" aria-hidden="true"><path d="M60 58H195C280 58 260 114 350 114H525C610 114 590 170 680 170H920" /><path className="scr-benefits-traveller" pathLength="100" d="M60 58H195C280 58 260 114 350 114H525C610 114 590 170 680 170H920" /></svg><ol>{[
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
