const sorpSource = "https://www.charitysorp.org/documents/d/guest/charities-sorp-2026-1";

const focusAreas = [
  {
    title: "OBJECTIVES AND ACTIVITIES",
    text: "What the charity is trying to achieve, what it does, the difference it seeks to make and its short- and longer-term aims.",
  },
  {
    title: "ACHIEVEMENTS AND PERFORMANCE",
    text: "What happened, what was achieved, the outputs, outcomes and impact, how success is measured and the difference made to beneficiaries and wider society.",
  },
  {
    title: "LEARNING AND FUTURE DIRECTION",
    text: "What worked or did not, what affected results, what was learned and how that informs future aims, activities and decisions.",
  },
  {
    title: "SUSTAINABILITY",
    text: "How the charity is responding to and managing environmental, governance and social matters.",
  },
];

const detailAreas = [
  {
    title: "WHY MODULE 1?",
    text: "Module 1 — Trustees’ Annual Report — contains the narrative reporting requirements about a charity’s aims, activities, achievements, difference made and, for the relevant tiers, sustainability. We draw on SORP’s tiering rules, MUST / SHOULD / MAY language, glossary and impact definition only to interpret Module 1. Other accounting modules are not additional scored requirements in this review.",
  },
  {
    title: "WHY OBJECTIVES AND ACTIVITIES?",
    text: "Impact does not begin with an impact claim. It begins with the charity’s purpose, aims, activities and the change it seeks to create. SORP requires this information and asks Tier 2 and Tier 3 charities to describe the changes or differences sought and the criteria or measures used to assess success.",
  },
  {
    title: "PUBLIC BENEFIT",
    text: "Public benefit and impact are closely related, but Module 1’s specific public-benefit reporting requirement differs by jurisdiction. We apply a SORP requirement only where it applies. An equivalent question elsewhere must be identified as MSI methodology, not a universal SORP MUST.",
  },
  {
    title: "OUTPUTS, OUTCOMES AND IMPACT",
    text: "The report and accounts together should show what the charity has done (outputs), what it has achieved (outcomes) and what difference it has made (impact). Activity and output reporting alone are not the same as evidence of change.",
  },
  {
    title: "SHORT- AND LONGER-TERM AIMS",
    text: "For Tier 2 and Tier 3, SORP calls for a more detailed account of short- and longer-term aims and objectives and how they relate. There is no universal timeframe: it depends on the charity’s work and the change it seeks to create.",
  },
  {
    title: "FAIR, BALANCED AND UNDERSTANDABLE REPORTING",
    text: "SORP calls for a fair, balanced and understandable Trustees’ Annual Report. We treat balance as a cross-cutting quality principle when looking at success, failure, challenges, limitations, positive and negative factors, and learning. We do not turn it automatically into a separate MUST.",
  },
  {
    title: "LEARNING",
    text: "SORP describes the report as an opportunity to reflect on successes, failures and learning. For Tier 2 and Tier 3 it also recommends explaining significant positive and negative factors affecting objectives and, where relevant, how they influence future plans. We distinguish those recommendations from MUST requirements and explanatory guidance.",
  },
  {
    title: "FUTURE PLANS",
    text: "All tiers must summarise future plans. Tier 2 and Tier 3 must also cover future aims, objectives and planned activities. SORP recommends explaining how experience and lessons learned have influenced plans and resource decisions. We include these provisions where they help tell the impact story, not as a review of every aspect of organisational planning.",
  },
  {
    title: "ACTIVITIES AND FINANCIAL INFORMATION",
    text: "The narrative about activities, projects and services should make sense alongside the accounts. We consider that coherence when assessing the impact story, without conducting a financial-statement audit.",
  },
  {
    title: "SUSTAINABILITY",
    text: "Tier 1 and Tier 2 trustees MAY explain how the charity responds to and manages environmental, governance and social matters. For Tier 3, a summary is a MUST. SORP examples include climate measures, privacy, cyber and data security, business ethics, employee wellbeing, board diversity and local-community support. These are examples, not a universal mandatory checklist.",
  },
  {
    title: "WHAT IS OUTSIDE THIS REVIEW",
    text: "This is not a full SORP 2026 compliance assessment. It does not assess all accounting treatments, financial statements, reserves, general financial review, governance or trustee details, standalone volunteer reporting, fundraising, investments, grant-making, specialist transactions or the other SORP modules. They matter, but sit outside this focused MSI review.",
  },
  {
    title: "SORP REQUIREMENT VS MSI JUDGEMENT",
    text: "SORP says what a charity MUST, SHOULD or MAY report. MSI methodology may assess how convincingly the available evidence supports that reporting. For example, where SORP requires an impact explanation, MSI may examine whether claims are proportionate to evidence, limitations are acknowledged, attribution is appropriate and confidence is justified. These MSI tests are not themselves SORP requirements.",
  },
];

export function SorpMethodologyGuide() {
  return <div className="scr-public-method-guide">
    <p className="scr-kicker">OUR METHODOLOGY</p>
    <h2>One source.<br />Clear distinctions.</h2>
    <div className="scr-public-method-guide-rule" aria-hidden="true" />
    <p>Module 1 tells us what to assess. MSI labels its own evidence judgements separately.</p>
  </div>;
}

export function SorpPublicMethodology() {
  return <div className="scr-public-method">
    <header>
      <p className="scr-kicker">OUR METHODOLOGY · QUICK READ</p>
      <h1>SORP 2026 IS OUR SOURCE OF TRUTH.</h1>
      <p className="scr-public-method-lead">This review is built from the impact and sustainability reporting requirements in <strong>Module 1 — Trustees’ Annual Report</strong> of Charities SORP 2026.</p>
      <p>We use SORP’s language, tiers and MUST / SHOULD / MAY distinctions wherever possible. We label My Social Impact’s own evidence and quality judgements as <strong>MSI methodology</strong>, not SORP requirements. SORP sits within the wider legal and FRS 102 reporting framework.</p>
    </header>

    <section className="scr-public-method-impact" aria-labelledby="scr-impact-definition">
      <span>SORP 2026 DEFINITION</span>
      <h2 id="scr-impact-definition">WHAT DOES SORP MEAN BY IMPACT?</h2>
      <blockquote>“Impact is the effect or influence that a charity has on its beneficiaries and wider society.”</blockquote>
      <p>In plain English, impact reporting describes the difference the charity’s work has made to beneficiaries’ circumstances and, where practicable, wider society.</p>
    </section>

    <section className="scr-public-method-focus" aria-labelledby="scr-method-focus">
      <h2 id="scr-method-focus">WHAT WE ASSESS</h2>
      <ol>{focusAreas.map((area, index) => <li key={area.title}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{area.title}</h3><p>{area.text}</p></div></li>)}</ol>
      <p className="scr-public-method-note">“Learning and future direction” is an MSI plain-English grouping within SORP’s <em>Achievements and performance</em> and <em>Plans for future periods</em> categories, not a replacement SORP heading.</p>
    </section>

    <section className="scr-public-method-tiers" aria-labelledby="scr-method-tiers">
      <h2 id="scr-method-tiers">THREE REPORTING TIERS</h2>
      <div className="scr-public-method-tier-grid"><div><strong>TIER 1</strong><span>Gross income up to £500,000</span></div><div><strong>TIER 2</strong><span>Above £500,000 to £15 million</span></div><div><strong>TIER 3</strong><span>Above £15 million</span></div></div>
      <p>Tier 1 follows Tier 1 requirements. Tier 2 follows Tier 1 + Tier 2. Tier 3 follows Tier 1 + Tier 2 + Tier 3.</p>
      <div className="scr-public-method-tier-examples"><p><strong>IMPACT</strong> The explicit requirement to explain the impact the charity is making applies to Tier 2 and Tier 3. Tier 1 still has achievements and beneficiary-difference requirements, but they are not identical.</p><p><strong>SUSTAINABILITY</strong> Tier 1: MAY · Tier 2: MAY · Tier 3: MUST.</p></div>
    </section>

    <section className="scr-public-method-language" aria-labelledby="scr-method-language">
      <h2 id="scr-method-language">THE LANGUAGE WE USE</h2>
      <dl><div><dt>MUST</dt><dd>Required for SORP compliance.</dd></div><div><dt>SHOULD</dt><dd>A SORP good-practice recommendation; not following it is not itself a SORP departure.</dd></div><div><dt>MAY</dt><dd>Optional for the charity to adopt.</dd></div><div><dt>GUIDANCE</dt><dd>Explanation or illustration, not itself a MUST / SHOULD / MAY requirement.</dd></div><div><dt>MSI METHODOLOGY</dt><dd>Our separately labelled evidence or quality judgement, not an official SORP category.</dd></div></dl>
    </section>

    <details className="scr-public-method-detail">
      <summary><span><small>WANT TO SEE EXACTLY HOW THE REVIEW IS BUILT?</small><strong>READ THE DETAILED METHODOLOGY</strong></span><span className="scr-public-method-detail-mark" aria-hidden="true">+</span></summary>
      <div className="scr-public-method-detail-body">
        <p className="scr-kicker">THE DETAIL</p>
        <p>We want this review to be transparent. Here is how its scope is defined and how SORP 2026 informs the assessment.</p>
        <ol>{detailAreas.map((area, index) => <li key={area.title}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{area.title}</h3><p>{area.text}</p>{index === 11 && <div className="scr-public-method-labels"><span>SORP REQUIREMENT</span><span>MSI METHODOLOGY</span></div>}</div></li>)}</ol>
        <section className="scr-public-method-register"><h3>REQUIREMENT-BY-REQUIREMENT METHODOLOGY</h3><p>We map every assessment question back to its SORP paragraph, applicable tier and requirement status. The detailed requirement mapping will appear here.</p></section>
        <p className="scr-public-method-source"><a href={sorpSource} target="_blank" rel="noreferrer">READ CHARITIES SORP 2026 ↗</a></p>
      </div>
    </details>
  </div>;
}
