import { isReportV2 } from "./report-methodology";
import type { Framework } from "./rubric";

export type LearningSlide = {
  label: string;
  headline: string;
  explanation: string;
  example?: string;
};

const claims: LearningSlide[] = [
  {
    label: "Introduction",
    headline: "WE’RE PREPARING YOUR REVIEW.",
    explanation:
      "While we work, discover the five principles behind making credible impact claims.",
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
    headline: "GOOD CLAIMS BUILD TRUST.",
    explanation: "But good reporting is only the beginning.",
  },
];
const excellence: LearningSlide[] = [
  {
    label: "Introduction",
    headline: "WE’RE PREPARING YOUR REVIEW.",
    explanation:
      "While we work, discover the five pillars of treating social impact as a serious management discipline.",
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
    headline: "IMPACT IS A MANAGEMENT DISCIPLINE.",
    explanation:
      "It deserves attention throughout the year, not just at reporting time.",
  },
];
const report: LearningSlide[] = [
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

// Existing v1 reports retain their own five-pillar names. Scoring stays untouched.
const reportV1: LearningSlide[] = [
  report[0],
  { ...report[1], label: "Clarity", headline: "MAKE IT EASY TO UNDERSTAND." },
  report[2],
  { ...report[3], label: "Design" },
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
  report[6],
];

export function learningSlides(framework: Framework, version: string) {
  return framework === "claims"
    ? claims
    : framework === "excellence"
      ? excellence
      : isReportV2(version)
        ? report
        : reportV1;
}
