import { isReportV2, isRevisedReport } from "./report-methodology";
import type { Framework } from "./rubric";

export type LearningSlide = {
  label: string;
  headline: string;
  explanation: string;
  example?: string;
  why?: string;
  href?: string;
  linkLabel?: string;
};

const claims: LearningSlide[] = [
  {
    label: "Introduction",
    headline: "GOOD IMPACT CLAIMS NEED GOOD EVIDENCE.",
    explanation:
      "While we review your report, discover the five principles behind making credible impact claims.",
  },
  {
    label: "Evidence",
    headline: "WHAT’S THE PROOF?",
    explanation:
      "Show the change people experienced, with evidence that supports what you say.",
    example:
      "Attendance shows reach. A change in wellbeing needs different evidence.",
  },
  {
    label: "Proportion",
    headline: "DOES THE CLAIM MATCH THE EVIDENCE?",
    explanation:
      "Make the strongest claim your evidence supports. No stronger.",
    example:
      "Ten encouraging interviews offer insight. They don’t speak for everyone.",
  },
  {
    label: "Transparency",
    headline: "SHOW YOUR WORKINGS.",
    explanation:
      "Explain where your evidence comes from and what it cannot tell you.",
    example: "Say who responded, how you asked and whose voices are missing.",
  },
  {
    label: "Balance",
    headline: "TELL THE WHOLE STORY.",
    explanation:
      "Include the challenges and different experiences alongside the successes.",
    example: "If it worked for some groups but not others, that matters.",
  },
  {
    label: "Learning",
    headline: "WHAT WILL YOU DO DIFFERENTLY?",
    explanation:
      "Turn what you discover into a decision about what to keep, change or stop.",
    example: "Name the next action, who owns it and when you’ll check it.",
  },
  {
    label: "The bigger picture",
    headline: "CREDIBILITY BUILDS TRUST.",
    explanation:
      "The Social Impact Claims Code is My Social Impact’s framework for communicating impact responsibly.",
    href: "https://mysocialimpact.org/social-impact-claims-code",
    linkLabel: "Explore the Claims Code ↗",
  },
];
const excellence: LearningSlide[] = [
  {
    label: "Introduction",
    headline: "SOCIAL IMPACT IS A MANAGEMENT DISCIPLINE.",
    explanation:
      "While we review your report, discover how Social Impact Excellence helps organisations embed impact into everyday management.",
  },
  {
    label: "Purpose",
    headline: "KNOW WHY YOU EXIST.",
    explanation:
      "Be clear about the difference you want to make, and for whom.",
    example: "What should change for the people you exist to serve?",
  },
  {
    label: "Leadership",
    headline: "IMPACT STARTS AT THE TOP.",
    explanation:
      "Make social impact part of the decisions leaders take and the questions boards ask.",
    example:
      "Discuss what the evidence means, not just whether the report is finished.",
  },
  {
    label: "Data",
    headline: "MEASURE WHAT MATTERS.",
    explanation:
      "Choose information that reveals meaningful change, alongside the activity that made it possible.",
    example: "Count appointments. Then ask what changed afterwards.",
  },
  {
    label: "Delivery",
    headline: "TURN PURPOSE INTO ACTION.",
    explanation:
      "Use evidence to improve how your work happens and the difference it makes.",
    example: "When evidence challenges your assumptions, adapt the delivery.",
  },
  {
    label: "Communications",
    headline: "TELL A STORY WORTH BELIEVING.",
    explanation:
      "Make your impact understandable, engaging and honest about its limits.",
    example: "Show what changed, how you know and what remains uncertain.",
  },
  {
    label: "The bigger picture",
    headline: "IMPACT ISN’T AN ANNUAL EXERCISE.",
    explanation:
      "Social Impact Excellence treats impact as an ongoing management discipline. One report cannot establish an organisation’s complete maturity.",
    href: "https://socialimpactexcellence.org",
    linkLabel: "Explore the full maturity assessment ↗",
  },
];
const legacyReport: LearningSlide[] = [
  {
    label: "Introduction",
    headline: "WE’RE PREPARING YOUR REVIEW.",
    explanation:
      "While we work, discover five things that make an impact report clear, compelling and engaging.",
  },
  {
    label: "Readability and hierarchy",
    headline: "MAKE THE FINDINGS EASY TO FIND.",
    explanation:
      "Give readers clear headings, comfortable text and the important findings first.",
    example: "Lead with what changed. Let the detail support it.",
  },
  {
    label: "Storytelling",
    headline: "EVERY NUMBER HAS A STORY.",
    explanation:
      "Connect the problem, your work and the change it helped make.",
    example: "A personal story brings evidence to life. It doesn’t replace it.",
  },
  {
    label: "Visual design",
    headline: "MAKE EVERY PAGE COUNT.",
    explanation:
      "Use type, space and imagery to give the message a clear, purposeful shape.",
    example: "A simple black-and-white page can be beautifully effective.",
  },
  {
    label: "Data communication",
    headline: "MAKE THE NUMBERS MEAN SOMETHING.",
    explanation:
      "Choose the clearest way to show the finding, with labels, context and sources.",
    example: "A useful sentence can beat a decorative chart.",
  },
  {
    label: "Accessibility",
    headline: "OPEN THE REPORT TO MORE PEOPLE.",
    explanation:
      "Consider contrast, readable text, meaningful structure and alternatives to images.",
    example: "A report should work when enlarged, not just when admired.",
  },
  {
    label: "The bigger picture",
    headline: "YOUR IMPACT DESERVES TO BE SEEN.",
    explanation:
      "Clearer writing, stronger design and better storytelling can bring it to life.",
  },
];

const report: LearningSlide[] = [
  {
    label: "Introduction",
    headline: "DOES YOUR REPORT MAKE AN IMPACT?",
    explanation:
      "While we review your report, discover what makes impact communication clear, compelling and memorable.",
  },
  {
    label: "Readability & Copy",
    headline: "MAKE EVERY WORD COUNT.",
    explanation:
      "We look at how easily people can read and understand your report: clear writing, manageable paragraphs and proportionate copy, with unnecessary jargon and repetition edited out.",
    why: "Good writing makes important ideas easier to understand.",
  },
  {
    label: "Information Hierarchy",
    headline: "MAKE THE IMPORTANT THINGS OBVIOUS.",
    explanation:
      "We examine how findings are organised, prioritised and presented. Can someone quickly find your most important achievements and conclusions, then explore the supporting detail?",
    why: "Great reports reward both a quick glance and a deeper read.",
  },
  {
    label: "Visual Design",
    headline: "DESIGN SHOULD DO SOMETHING.",
    explanation:
      "We inspect actual pages to see how typography, composition, colour and imagery improve clarity and engagement. Consistent colours or photographs alone don’t establish good design.",
    why: "Beautiful design helps understanding; it is more than decoration.",
  },
  {
    label: "Storytelling",
    headline: "GIVE THE NUMBERS A HUMAN STORY.",
    explanation:
      "We examine how your report connects purpose, facts, experiences and meaningful change. Relevant examples should illuminate the evidence, without exaggeration or unnecessary emotional language.",
    why: "Readers need to understand why the evidence matters.",
  },
  {
    label: "Data Presentation",
    headline: "MAKE THE NUMBERS TALK.",
    explanation:
      "We examine whether readers can interpret charts, tables and important figures quickly, with useful labels and context. We judge communication here; the Claims Code separately examines credibility.",
    why: "The clearest format helps people understand what the numbers mean.",
  },
  {
    label: "The bigger picture",
    headline: "YOUR IMPACT DESERVES TO BE UNDERSTOOD.",
    explanation:
      "A good report makes evidence accessible, engaging and memorable. My Social Impact and The Ideas Shed can help with design, storytelling and digital presentation.",
    href: "/contact?service=improvement",
    linkLabel: "Let’s bring your report to life ↗",
  },
];
const teaching = {
  claims: [
    [
      "We examine the evidence behind important claims. Does it demonstrate the outcomes being described, or only the activities delivered? We distinguish what happened from what changed.",
      "Credible claims need evidence that supports the difference being claimed.",
    ],
    [
      "We examine whether conclusions go beyond what the evidence reasonably demonstrates, including the difference between contribution and causation. Stronger claims need appropriately stronger support.",
      "Proportionate wording protects trust without understating useful findings.",
    ],
    [
      "We look for clear sources, collection methods, definitions and limitations. Can readers follow where information came from and understand whose experiences it represents?",
      "Showing your workings helps readers judge what the evidence can tell them.",
    ],
    [
      "We examine whether the overall picture is fair: challenges, limitations, different experiences and things that didn’t work should sit alongside the successes.",
      "A balanced account is more useful and credible than selective good news.",
    ],
    [
      "We look for lessons that inform future decisions, practical improvement actions and follow-up on earlier learning where relevant. Evidence should lead to something useful.",
      "Learning turns reporting into better decisions about what happens next.",
    ],
  ],
  excellence: [
    [
      "We look for a clear social purpose, intended beneficiaries and outcomes, and an explanation of the change the organisation wants to create through its work.",
      "Purpose gives strategy, delivery and measurement a shared direction.",
    ],
    [
      "We look for evidence that leaders take responsibility for impact, involve stakeholders and use what they learn to make decisions. Responsibility should be visible in the report.",
      "Impact should influence management, not just marketing.",
    ],
    [
      "We examine whether the organisation measures meaningful changes rather than simply counting activities, using information that fits its intended outcomes and explains how it was gathered.",
      "Useful data helps people understand progress and make informed decisions.",
    ],
    [
      "We examine how activities connect to intended outcomes, and whether the report demonstrates progress, adaptation and improvement. We look at what the report shows, not undisclosed practice.",
      "Connecting purpose to delivery helps organisations improve the difference they make.",
    ],
    [
      "We examine whether impact is communicated clearly, credibly and appropriately for its audiences, with useful evidence, understandable findings and an honest account of limitations.",
      "People need to understand the difference being made and how it is known.",
    ],
  ],
};
for (const [name, slides] of [
  ["claims", claims],
  ["excellence", excellence],
] as const) {
  slides.slice(1, 6).forEach((slide, i) => {
    slide.explanation = teaching[name][i][0];
    slide.why = teaching[name][i][1];
    delete slide.example;
  });
}

// Existing v1 reports retain their own five-pillar names. Scoring stays untouched.
const reportV1: LearningSlide[] = [
  legacyReport[0],
  {
    ...legacyReport[1],
    label: "Clarity",
    headline: "MAKE IT EASY TO UNDERSTAND.",
  },
  legacyReport[2],
  { ...legacyReport[3], label: "Design" },
  {
    label: "Engagement",
    headline: "GIVE PEOPLE A REASON TO READ.",
    explanation:
      "Catch attention with a purposeful opening and reward it with useful, well-paced content.",
    example: "A static PDF can be engaging without interactive features.",
  },
  {
    label: "Communication",
    headline: "MAKE THE MESSAGE MATTER.",
    explanation:
      "Help people understand the finding, remember it and see what happens next.",
    example: "Give a chart a title that tells readers what it means.",
  },
  legacyReport[6],
];

export function learningSlides(framework: Framework, version: string) {
  return framework === "claims"
    ? claims
    : framework === "excellence"
      ? excellence
      : isRevisedReport(version)
        ? report
        : isReportV2(version)
          ? legacyReport
          : reportV1;
}
