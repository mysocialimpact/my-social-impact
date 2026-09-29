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

const detailGroups = [
  {
    title: "A. HOW THE SCOPE IS DEFINED",
    areas: [
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
        title: "SHORT- AND LONGER-TERM AIMS",
        text: "For Tier 2 and Tier 3, SORP calls for a more detailed account of short- and longer-term aims and objectives and how they relate. There is no universal timeframe: it depends on the charity’s work and the change it seeks to create.",
      },
    ],
  },
  {
    title: "B. MSI CROSS-CUTTING PRINCIPLES",
    introduction: "“Cross-cutting principles” is MSI methodology terminology, not a SORP heading or category. It groups SORP provisions that shape the quality, credibility and coherence of reporting across several areas. They influence how substantive requirements are interpreted; they create no standalone assessment questions or separate points. Each underlying SORP provision retains its own status.",
    areas: [
      {
        title: "FAIR, BALANCED AND UNDERSTANDABLE",
        text: "SORP 1.5, supported by 1.9, says the Trustees’ Annual Report should provide a fair, balanced and understandable review and offers an opportunity to reflect on successes, failures and learnings. A credible account is understandable and acknowledges material limitations, challenges and things that did not go as planned, rather than presenting only the best possible picture. MSI applies this when interpreting relevant substantive answers, not as a standalone question.",
      },
      {
        title: "OUTPUTS → OUTCOMES → IMPACT",
        text: "SORP 1.8 itself distinguishes what the charity has done (outputs), what it has achieved (outcomes) and what difference it has made (impact). Doing something is not the same as achieving something; an achievement does not by itself demonstrate impact. This SORP distinction shapes MSI’s assessment of substantive Achievements and Performance requirements. It is not a standalone question.",
      },
      {
        title: "LEARNING AND REFLECTION",
        text: "SORP 1.9 describes the report as an opportunity to reflect on successes, failures and learnings, and to help users assess progress against objectives and understand future plans. Good reporting shows what the charity understands and learns from experience, not just evidence of success. MSI applies this across relevant performance, positive and negative factors, future direction and use-of-lessons questions; it is not a standalone question.",
      },
      {
        title: "NARRATIVE–RESOURCE COHERENCE",
        text: "SORP 1.8 and 1.22 connect activities and achievements with income and expenditure. The activities, projects and services in the report should make sense alongside the accounts; financial information about resources spent should be consistent with the SoFA and notes. MSI looks for a coherent account of what the charity did, achieved and spent. This is not a standalone question or a financial-statement audit.",
      },
    ],
  },
  {
    title: "C. SUBSTANTIVE AREAS",
    areas: [
      {
        title: "FUTURE PLANS",
        text: "All tiers must summarise future plans. Tier 2 and Tier 3 must also cover future aims, objectives and planned activities. SORP recommends explaining how experience and lessons learned have influenced plans and resource decisions. We include these provisions where they help tell the impact story, not as a review of every aspect of organisational planning.",
      },
      {
        title: "SUSTAINABILITY",
        text: "“Sustainability” is an official SORP 2026 Module 1 reporting category. SORP addresses how charities are responding to and managing environmental, governance and social matters. The requirement is tiered: Tier 1 and Tier 2 reporting is optional under paragraph 1.60; for Tier 3, paragraph 1.61 requires the Trustees’ Annual Report to provide a summary.",
      },
    ],
  },
  {
    title: "D. BOUNDARIES",
    areas: [
      {
        title: "WHAT IS OUTSIDE THIS REVIEW",
        text: "This is not a full SORP 2026 compliance assessment. It does not assess all accounting treatments, financial statements, reserves, general financial review, governance or trustee details, standalone volunteer reporting, fundraising, investments, grant-making, specialist transactions or the other SORP modules. They matter, but sit outside this focused MSI review.",
      },
      {
        title: "SORP REQUIREMENT VS MSI JUDGEMENT",
        text: "SORP says what a charity MUST, SHOULD or MAY report. MSI methodology may assess how convincingly the available evidence supports that reporting. For example, where SORP requires an impact explanation, MSI may examine whether claims are proportionate to evidence, attribution is appropriate and confidence is justified. These MSI tests are not themselves SORP requirements.",
      },
    ],
  },
];

const objectivesAndActivitiesTests = [
  {
    code: "OA1",
    title: "PURPOSE AND MAIN ACTIVITIES",
    basis: "Paragraph 1.19",
    applies: "Tier 1 · Tier 2 · Tier 3",
    status: "MUST",
    question: "Can the charity clearly explain why it exists and the main activities it undertakes in pursuit of those purposes?",
    why: "Impact starts with purpose. A charity cannot credibly explain the difference it is making unless it is clear about what it exists to achieve and what it actually does.",
  },
  {
    code: "OA2",
    title: "PUBLIC BENEFIT",
    basis: "Paragraph 1.20 — substantive public-benefit explanation",
    applies: "England, Wales and Northern Ireland · Tier 1 · Tier 2 · Tier 3",
    status: "MUST where the SORP requirement applies",
    question: "Can the charity explain how its main activities further its charitable purposes for public benefit?",
    why: "Public benefit is closely connected to impact because impact concerns the effect or influence a charity has on beneficiaries and wider society.",
  },
  {
    code: "OA3",
    title: "REPORTING-PERIOD AND LONGER-TERM AIMS",
    basis: "Paragraph 1.23, supported by paragraph 1.24",
    applies: "Tier 2 · Tier 3",
    status: "MUST",
    question: "Are the charity’s aims and objectives for the reporting period clear? Are its longer-term aims clear? Is the relationship between the short-term and longer-term aims understandable?",
    why: "Impact often develops over time. SORP specifically requires Tier 2 and Tier 3 charities to explain short- and longer-term aims and how they relate. There is no universal timeframe: it depends on the charity, its work and the change it seeks to create.",
  },
  {
    code: "OA4",
    title: "ACTIVITIES → AIMS",
    basis: "Paragraph 1.24",
    applies: "Tier 2 · Tier 3",
    status: "MUST",
    question: "Can the charity explain its significant programmes, projects or services and how they contribute to its stated aims and objectives?",
    why: "An activity list is not enough. The charity should be able to explain how what it does connects to what it is trying to achieve.",
  },
  {
    code: "OA5",
    title: "CHANGE SOUGHT",
    basis: "Paragraph 1.24",
    applies: "Tier 2 · Tier 3",
    status: "MUST",
    question: "Can the charity clearly explain the change or difference it is trying to make through its activities?",
    why: "This is one of the clearest links between SORP and impact reporting. It establishes the intended change before the review later considers what change was actually achieved.",
  },
  {
    code: "OA6",
    title: "STRATEGY",
    basis: "Paragraph 1.24",
    applies: "Tier 2 · Tier 3",
    status: "MUST",
    question: "Can the charity explain its strategy for achieving its stated aims and objectives?",
    why: "Impact reporting should not only describe activities. The charity should be able to explain how its approach is intended to lead towards its aims.",
  },
  {
    code: "OA7",
    title: "MEASURES OF SUCCESS",
    basis: "Paragraph 1.24",
    applies: "Tier 2 · Tier 3",
    status: "MUST",
    question: "Has the charity defined the criteria or measures it uses to assess success in the reporting period?",
    why: "A charity needs some basis for judging whether it has achieved what it intended to achieve. This becomes important later when the review considers actual performance and impact.",
  },
];

function ObjectivesAndActivitiesDetail() {
  return <div className="scr-public-method-objectives">
    <h3>OBJECTIVES AND ACTIVITIES</h3>
    <p>“Objectives and activities” is an official SORP 2026 Module 1 reporting category.</p>
    <p>For this Impact &amp; Sustainability Reporting review, we include the parts of this category that establish:</p>
    <ul>
      <li>why the charity exists</li>
      <li>what it does</li>
      <li>the public benefit it seeks to create</li>
      <li>its short- and longer-term aims</li>
      <li>how its activities contribute to those aims</li>
      <li>the change or difference it seeks to make</li>
      <li>its strategy</li>
      <li>how it defines success</li>
    </ul>
    <p>These form the foundation of an impact story: before a charity can explain what difference it has made, it needs to be clear about the change it is trying to create.</p>
    <div className="scr-public-method-oa-tests">
      {objectivesAndActivitiesTests.map((test) => <article key={test.code}>
        <h4><span>{test.code}</span> {test.title}</h4>
        <p><strong>SORP BASIS</strong> {test.basis}</p>
        <p><strong>APPLIES</strong> {test.applies}</p>
        <p><strong>STATUS</strong> {test.status}</p>
        <p><strong>PLAIN ENGLISH</strong> {test.question}</p>
        <p><strong>WHY THIS IS INCLUDED</strong> {test.why}</p>
        {test.code === "OA2" && <p><strong>SCOPE BOUNDARY</strong> Paragraph 1.20 also includes a formal statement about whether trustees had regard to Charity Commission public-benefit guidance. That administrative statement is not assessed in this Impact &amp; Sustainability review; it belongs in the wider full-SORP / TAR compliance review. The public-benefit MUST is not universal outside the jurisdictions where it applies.</p>}
      </article>)}
    </div>
    <div className="scr-public-method-oa-note">
      <h4>AVOIDING DOUBLE-COUNTING</h4>
      <p>The first question in paragraph 1.24 also asks how the charity performed against its aims and objectives. We do not score that performance element again here. Paragraph 1.28, under “Achievements and performance”, explicitly requires Tier 2 and Tier 3 charities to explain the extent to which their achievements met their aims and objectives. Objectives and activities assesses whether the aims are defined; Achievements and performance assesses what actually happened against those aims. Both paragraphs may support the later performance test, but the same requirement must not be scored twice.</p>
    </div>
    <div className="scr-public-method-oa-note">
      <h4>NOT EVERYTHING IN “OBJECTIVES AND ACTIVITIES” IS INCLUDED IN THIS IMPACT REVIEW.</h4>
      <p>Wider Module 1 requirements outside this tool’s scope as standalone assessment requirements are 1.21 — volunteer reporting, 1.25 — grant-making and social-investment disclosures, and 1.26 — additional volunteer information. Paragraph 1.22 is already incorporated into MSI’s cross-cutting principle NARRATIVE–RESOURCE COHERENCE; it does not create another standalone score here.</p>
    </div>
    <p>These are seven atomic methodology tests, not necessarily seven separate user-facing screens. The methodology preserves each distinct SORP test so requirements are not lost or double-counted. The eventual UX may group related tests, but the underlying methodology retains them separately.</p>
  </div>;
}

const achievementsAndPerformanceTests = [
  {
    code: "AP1",
    title: "MAIN ACHIEVEMENTS",
    basis: "Paragraph 1.27",
    applies: "Tier 1 · Tier 2 · Tier 3",
    status: "MUST",
    question: "Can the charity clearly summarise its main achievements during the reporting period?",
    why: "Impact reporting needs to explain what was actually achieved, not simply what activities took place.",
  },
  {
    code: "AP2",
    title: "DIFFERENCE TO BENEFICIARIES / WIDER SOCIETY",
    basis: "Paragraph 1.27",
    applies: "Tier 1 · Tier 2 · Tier 3",
    status: "SHOULD CONSIDER",
    question: "Can the charity explain how its work made a difference to the circumstances of its beneficiaries and whether its work provided any wider benefits to society?",
    why: "SORP explicitly asks trustees to consider the difference their work has made to beneficiaries and wider society. This is directly relevant to impact reporting, even though it is not expressed in paragraph 1.27 as the same MUST as the requirement to summarise main achievements.",
  },
  {
    code: "AP3",
    title: "PERFORMANCE AGAINST AIMS",
    basis: "Paragraph 1.28",
    applies: "Tier 2 · Tier 3",
    status: "MUST",
    question: "Can the charity explain how well it carried out its activities and the extent to which its achievements met the aims and objectives set for the reporting period?",
    why: "This is where the assessment compares what the charity intended to achieve with what actually happened.",
  },
  {
    code: "AP4",
    title: "IMPACT MADE",
    basis: "Paragraph 1.30",
    applies: "Tier 2 · Tier 3",
    status: "MUST",
    question: "Can the charity explain the impact it is making?",
    why: "SORP describes impact as, arguably, the ultimate expression of a charity’s performance. This is one of the core explicit impact-reporting requirements in SORP 2026.",
  },
  {
    code: "AP5",
    title: "LONGER-TERM EFFECTS",
    basis: "Paragraph 1.30",
    applies: "Tier 2 · Tier 3",
    status: "MUST CONSIDER",
    question: "Has the charity considered the longer-term effect of its activities on individual beneficiaries and society as a whole?",
    why: "SORP explicitly requires Tier 2 and Tier 3 charities to consider longer-term effects. The report MUST explain the impact the charity is making and MUST consider the long-term effect of its activities; this is not a requirement for a separate full long-term impact report.",
  },
  {
    code: "AP6",
    title: "OUTPUTS ACHIEVED",
    basis: "Paragraph 1.31",
    applies: "Tier 2 · Tier 3",
    status: "SHOULD",
    question: "Can the charity explain the outputs achieved by its activities, particularly where numerical targets were set?",
    why: "SORP recommends explaining what was actually delivered. This supports the distinction between activities, outputs, outcomes and impact already included in MSI’s SORP-grounded cross-cutting principles.",
  },
  {
    code: "AP7",
    title: "FACTORS AFFECTING RESULTS",
    basis: "Paragraph 1.32",
    applies: "Tier 2 · Tier 3",
    status: "SHOULD",
    question: "Can the charity explain the significant positive and negative factors that affected achievement of its objectives, including factors outside its control? Where relevant, can it explain how those factors influenced future plans?",
    why: "Credible impact reporting should explain not only what happened, but the important factors that helped or hindered results.",
  },
];

function AchievementsAndPerformanceDetail() {
  return <div className="scr-public-method-achievements">
    <h3>ACHIEVEMENTS AND PERFORMANCE</h3>
    <p>“Achievements and performance” is an official SORP 2026 Module 1 reporting category.</p>
    <p>This is the heart of the impact-reporting assessment. It looks at:</p>
    <ul>
      <li>what the charity actually achieved</li>
      <li>whether its work made a difference</li>
      <li>how performance compared with its aims</li>
      <li>the impact it is making</li>
      <li>longer-term effects</li>
      <li>outputs achieved</li>
      <li>significant positive and negative factors affecting results</li>
    </ul>
    <div className="scr-public-method-oa-tests">
      {achievementsAndPerformanceTests.map((test) => <article key={test.code}>
        <h4><span>{test.code}</span> {test.title}</h4>
        <p><strong>SORP BASIS</strong> {test.basis}</p>
        <p><strong>APPLIES</strong> {test.applies}</p>
        <p><strong>STATUS</strong> {test.status}</p>
        <p><strong>PLAIN ENGLISH</strong> {test.question}</p>
        <p><strong>WHY THIS IS INCLUDED</strong> {test.why}</p>
        {test.code === "AP3" && <p><strong>AVOIDING DOUBLE-COUNTING</strong> This performance element overlaps with paragraph 1.24 and is assessed here, not again under Objectives and Activities. That section assesses whether the aims were defined; this one assesses what actually happened against them. The same requirement must not be scored twice.</p>}
      </article>)}
    </div>
    <div className="scr-public-method-oa-note">
      <h4>SUPPORTING SORP MATERIAL — DO NOT DOUBLE-SCORE</h4>
      <p>Paragraph 1.31 also recommends a summary of measures or indicators used to assess performance, and information on activities, outputs and outcomes or impacts in the context of their contribution to aims and objectives. Measures and indicators are already substantively captured under OA7 — Measures of Success. Activities → outputs → outcomes → impact is already incorporated into MSI’s SORP-grounded cross-cutting principles. These provisions support the methodology without creating duplicate scores.</p>
    </div>
    <div className="scr-public-method-oa-note">
      <h4>NOT EVERYTHING IN “ACHIEVEMENTS AND PERFORMANCE” IS INCLUDED IN THIS IMPACT REVIEW.</h4>
      <p>Paragraph 1.29 — investment performance — and paragraph 1.33 — Tier 3 fundraising performance and related fundraising expenditure — remain relevant to full SORP reporting but are outside this Impact &amp; Sustainability Reporting assessment.</p>
    </div>
    <div className="scr-public-method-oa-note">
      <h4>MSI METHODOLOGY BOUNDARY</h4>
      <p>MSI may provide additional quality and evidence insights around evidence strength, attribution versus contribution, proportionality of claims, limitations and confidence. These are MSI methodology and improvement insights. They do not create extra SORP requirements, score penalties or points unless they map directly to an explicit in-scope SORP requirement. The SORP readiness score is driven by mapped SORP requirements and recommendations, not by extra MSI thinking.</p>
    </div>
    <p>These are seven atomic methodology tests, not necessarily seven separate user-facing screens. The methodology preserves each distinct SORP test so requirements are not lost or double-counted. The eventual UX may group related tests, but the underlying methodology retains them separately.</p>
  </div>;
}

const learningAndFutureDirectionTests = [
  {
    code: "LF1",
    title: "FUTURE PLANS",
    basis: "Paragraph 1.47",
    applies: "Tier 1 · Tier 2 · Tier 3",
    status: "MUST",
    question: "Can the charity explain what it plans to do next?",
    why: "Impact reporting should connect what has happened with what the charity intends to do in the future.",
  },
  {
    code: "LF2",
    title: "FUTURE AIMS AND ACTIVITIES",
    basis: "Paragraph 1.48",
    applies: "Tier 2 · Tier 3",
    status: "MUST",
    question: "Can the charity explain its future aims and objectives and the activities it plans to undertake to achieve them?",
    why: "This creates continuity between the change the charity is trying to make, what it has learned so far and what it intends to do next.",
  },
  {
    code: "LF3",
    title: "LEARNING → FUTURE DIRECTION",
    basis: "Paragraph 1.49",
    applies: "Tier 2 · Tier 3",
    status: "SHOULD",
    question: "Can the charity explain how experience and lessons learned have influenced future plans, future decisions and how resources will be allocated?",
    why: "This is the clearest SORP link between learning and future decision-making. A credible impact story should show not only what happened, but how experience is influencing what the charity does next.",
  },
];

function LearningAndFutureDirectionDetail() {
  return <div className="scr-public-method-learning">
    <h3>LEARNING AND FUTURE DIRECTION</h3>
    <p>“Learning and future direction” is an MSI methodology grouping, not a formal SORP 2026 heading. “Plans for future periods” is the official SORP terminology.</p>
    <p>We use this grouping to bring together the impact-relevant parts of SORP’s “Plans for future periods” requirements, supported by SORP’s wider emphasis on learning and reflection. Impact reporting should not stop at explaining what happened. It should also help users understand:</p>
    <ul>
      <li>what the charity plans to do next</li>
      <li>how future aims and activities are developing</li>
      <li>what has been learned</li>
      <li>how that learning is influencing future decisions and use of resources</li>
    </ul>
    <div className="scr-public-method-oa-tests">
      {learningAndFutureDirectionTests.map((test) => <article key={test.code}>
        <h4><span>{test.code}</span> {test.title}</h4>
        <p><strong>SORP BASIS</strong> {test.basis}</p>
        <p><strong>APPLIES</strong> {test.applies}</p>
        <p><strong>STATUS</strong> {test.status}</p>
        <p><strong>PLAIN ENGLISH</strong> {test.question}</p>
        <p><strong>WHY THIS IS INCLUDED</strong> {test.why}</p>
        {test.code === "LF1" && <p><strong>SCOPE BOUNDARY</strong> Paragraph 1.47 says it may be helpful to consider reserves and going concern when considering future plans. This Impact &amp; Sustainability review does not assess reserves or going concern; those belong in the wider full-SORP review.</p>}
      </article>)}
    </div>
    <div className="scr-public-method-oa-note">
      <h4>SUPPORTING SORP MATERIAL — DO NOT DOUBLE-SCORE</h4>
      <p>Paragraph 1.9 describes the Trustees’ Annual Report as an opportunity to reflect on successes, failures and learnings and help users understand future plans. It is already included in MSI’s cross-cutting “Learning and reflection” principle and creates no score here.</p>
      <p>Paragraph 1.32 recommends explaining significant positive and negative factors affecting results and, where relevant, how they influenced future plans. It is already captured under AP7 — Factors affecting results, and is not scored again here.</p>
    </div>
    <p>These are three atomic methodology tests, not necessarily three separate user-facing screens. The methodology preserves each distinct SORP test so requirements are not lost or double-counted. The eventual UX may group related tests, but the underlying methodology retains them separately.</p>
  </div>;
}

function SustainabilityDetail() {
  return <div className="scr-public-method-sustainability">
    <div className="scr-public-method-oa-tests">
      <article>
        <h4><span>S1</span> SUSTAINABILITY RESPONSE</h4>
        <p><strong>SORP BASIS</strong> Paragraphs 1.60 and 1.61</p>
        <p><strong>APPLIES / STATUS</strong> Tier 1: MAY · Tier 2: MAY · Tier 3: MUST</p>
        <p><strong>PLAIN ENGLISH</strong> Can the charity explain how it is responding to and managing environmental, governance and social matters?</p>
        <p><strong>WHY THIS IS INCLUDED</strong> SORP 2026 explicitly includes sustainability within Module 1 of the Trustees’ Annual Report. The level of requirement depends on the charity’s tier.</p>
        <p><strong>TIER DISTINCTION</strong> For Tier 1 and Tier 2, trustees MAY choose to report in this area. For Tier 3, the report MUST provide a summary. Choosing not to report under paragraph 1.60 must not itself be treated as failure to meet a SORP requirement. This is a methodology principle; it does not change assessment scoring code here.</p>
      </article>
      <article>
        <h4><span>S2</span> SIGNPOSTING TO OTHER SUSTAINABILITY REPORTING</h4>
        <p><strong>SORP BASIS</strong> Paragraph 1.64</p>
        <p><strong>APPLIES</strong> Tier 3</p>
        <p><strong>STATUS</strong> SHOULD</p>
        <p><strong>PLAIN ENGLISH</strong> If the charity already reports its environmental, governance or social information somewhere other than the Trustees’ Annual Report, does the report tell users where they can find it, for example through a website link or another published report?</p>
        <p><strong>WHY THIS IS INCLUDED</strong> SORP recognises that detailed sustainability reporting may already exist elsewhere. Where that happens, it recommends signposting users to that information.</p>
      </article>
    </div>
    <div className="scr-public-method-oa-note">
      <h4>EXAMPLES — NOT A MANDATORY CHECKLIST</h4>
      <p>SORP paragraphs 1.62 and 1.63 give examples of matters sustainability reporting might cover:</p>
      <p><strong>ENVIRONMENTAL</strong> Climate-related risks and opportunities, relevant targets and key performance indicators.</p>
      <p><strong>GOVERNANCE</strong> Privacy, cyber security, data security and business ethics.</p>
      <p><strong>SOCIAL</strong> Employee engagement and wellbeing, board diversity and inclusion, and support for the local community.</p>
      <p>These are SORP examples, not a universal mandatory checklist. They do not each become a separate requirement, question or score. Relevant matters depend on the charity and its circumstances.</p>
    </div>
    <div className="scr-public-method-oa-note">
      <h4>ADDITIONAL LEGAL REQUIREMENTS MAY APPLY</h4>
      <p>Paragraph 1.65 flags that some charitable companies may also be subject to separate statutory sustainability, energy, carbon or climate-related disclosure requirements. This review does not determine full compliance with those regimes. Where relevant, the charity should check the requirements that apply to its legal form and jurisdiction.</p>
      <p>This is a conditional legal / applicability flag, not another generic sustainability score or atomic test in this review. It belongs in a future full-SORP or wider compliance assessment where appropriate.</p>
    </div>
    <p>Sustainability contains two atomic assessment tests: S1 — Sustainability response and S2 — Signposting to other sustainability reporting. Paragraph 1.65 adds one conditional legal flag. The examples in paragraphs 1.62–1.63 create no extra tests.</p>
  </div>;
}

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

    <section className="scr-public-method-crosscut" aria-labelledby="scr-method-crosscut">
      <h2 id="scr-method-crosscut">CROSS-CUTTING PRINCIPLES</h2>
      <p>MSI applies four principles drawn from SORP 2026 across relevant assessment areas: fair and balanced reporting, outputs → outcomes → impact, learning, and coherence between the narrative and use of resources. “Cross-cutting principles” is an MSI methodology term, not a SORP heading. They shape how answers are assessed without creating separate requirements, questions or points.</p>
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
        {detailGroups.map((group, groupIndex) => {
          const preceding = detailGroups.slice(0, groupIndex).reduce((count, section) => count + section.areas.length, 0);
          return <section className="scr-public-method-detail-group" key={group.title}>
            <h2>{group.title}</h2>
            {"introduction" in group && <p>{group.introduction}</p>}
            {group.title === "C. SUBSTANTIVE AREAS" && <ObjectivesAndActivitiesDetail />}
            {group.title === "C. SUBSTANTIVE AREAS" && <AchievementsAndPerformanceDetail />}
            {group.title === "C. SUBSTANTIVE AREAS" && <LearningAndFutureDirectionDetail />}
            <ol start={preceding + 1}>{group.areas.map((area, index) => <li key={area.title}><span>{String(preceding + index + 1).padStart(2, "0")}</span><div><h3>{area.title}</h3><p>{area.text}</p>{area.title === "SUSTAINABILITY" && <SustainabilityDetail />}{area.title === "SORP REQUIREMENT VS MSI JUDGEMENT" && <div className="scr-public-method-labels"><span>SORP REQUIREMENT</span><span>MSI METHODOLOGY</span></div>}</div></li>)}</ol>
          </section>;
        })}
        <section className="scr-public-method-register"><h3>REQUIREMENT-BY-REQUIREMENT METHODOLOGY</h3><p>We map every assessment question back to its SORP paragraph, applicable tier and requirement status. The detailed requirement mapping will appear here.</p></section>
        <p className="scr-public-method-source"><a href={sorpSource} target="_blank" rel="noreferrer">READ CHARITIES SORP 2026 ↗</a></p>
      </div>
    </details>
  </div>;
}
