export const services = {
  "expert-review": {
    name: "Expert Impact Report Review",
    heading: "A fresh pair of expert eyes.",
    intro:
      "Want to go deeper? Our team can review your report, discuss the findings and help you turn recommendations into practical improvements.",
    benefits: [
      "Professional scrutiny of your most important impact claims",
      "A discussion of the evidence, context and limitations",
      "Clear priorities for a more credible, useful report",
    ],
  },
  preparation: {
    name: "Create an Impact Report",
    heading: "A report that does your impact justice.",
    intro:
      "Need an impact report from scratch? We can help you understand your impact, collect the evidence and produce a compelling, credible report.",
    benefits: [
      "A clear purpose, audience and reporting structure",
      "Practical evidence collection and impact analysis",
      "Thoughtful writing that connects your activities to meaningful change",
    ],
  },
  digitisation: {
    name: "Digitise Your Impact Report",
    heading: "Your report deserves more than a PDF.",
    intro:
      "Turn your existing impact report into an engaging, interactive digital experience that helps more people explore, understand and connect with your impact.",
    benefits: [
      "An accessible experience across phones, tablets and desktops",
      "Interactive presentation and useful data visualisation",
      "More ways for your audience to discover the story behind the evidence",
    ],
  },
  "human-director": {
    name: "Human Impact Director support",
    heading: "Someone in your corner.",
    intro:
      "Your own Impact Director. Without the full-time salary. Experienced people, intelligent technology and practical support shaped around your organisation.",
    benefits: [
      "Someone who understands your purpose and priorities",
      "Help interpreting evidence and making better decisions",
      "An agreed level of ongoing personal involvement",
    ],
  },
  essentials: {
    name: "Essentials",
    heading: "A little guidance. A clearer direction.",
    intro:
      "From £49 per month, indicatively. Light-touch intelligent digital guidance, structured recommendations and help monitoring impact priorities.",
    benefits: [
      "Primarily AI-enabled guidance",
      "Help organising priorities and next steps",
      "Routine personal meetings are not included in the concept",
    ],
  },
  supported: {
    name: "Supported",
    heading: "A professional helping you stay on track.",
    intro:
      "From £149 per month, indicatively. Ongoing intelligent support with periodic human review, with the level of involvement agreed together.",
    benefits: [
      "A professional perspective on your progress",
      "Help interpreting evidence and identifying improvements",
      "Periodic human review, with frequency agreed before engagement",
    ],
  },
  director: {
    name: "Director",
    heading: "Senior expertise. Without the full-time salary.",
    intro:
      "From £495 per month, indicatively. A more hands-on Impact Director service, with strategic input and regular interaction with an experienced professional.",
    benefits: [
      "A professional who gets to know your organisation",
      "Support for management and leadership decisions",
      "An agreed rhythm of conversations, priorities and progress reviews",
    ],
  },
  bespoke: {
    name: "Bespoke",
    heading: "Your organisation. Your particular challenges.",
    intro:
      "From £1,500+ per month, indicatively. Tailored support for larger or more complex organisations, with scope agreed together.",
    benefits: [
      "Potential for greater senior involvement",
      "Additional analysis and leadership engagement",
      "Custom projects and specialist support by agreement",
    ],
  },
  "ai-readiness": {
    name: "AI readiness advice",
    heading: "More time for the work that matters.",
    intro:
      "Explore where AI could improve your information, workflows and decisions as part of our broader advisory approach.",
    benefits: [
      "Understand your current use of AI and information",
      "Identify practical opportunities in analysis, reporting and workflows",
      "Agree sensible next steps; no formal diagnostic is included in a tier by default",
    ],
  },
  consultancy: {
    name: "Wider consultancy",
    heading: "The right expertise for your next step.",
    intro:
      "Boutique professional advice from My Social Impact, with impact management at its heart.",
    benefits: [
      "Strategy, purpose, leadership and organisational improvement",
      "Measurement, evaluation, data and impact communications",
      "Practical AI adoption, digital innovation and systems thinking",
    ],
  },
} as const;
export type Service = keyof typeof services;

export function serviceLabel(value: string) {
  return Object.hasOwn(services, value)
    ? services[value as Service].name
    : value === "feedback"
      ? "Product feedback"
      : value;
}
export const supportTiers = [
  {
    id: "free",
    name: "Free",
    price: "£0",
    summary: "Your first report review.",
    detail:
      "Initial automated assessment and practical recommendations. An accessible introduction, with no registration before you start.",
  },
  {
    id: "essentials",
    name: "Essentials",
    price: "£49",
    summary: "Intelligent digital guidance.",
    detail:
      "Light-touch, primarily AI-enabled guidance, structured recommendations and help monitoring impact priorities. No routine personal meetings.",
  },
  {
    id: "supported",
    name: "Supported",
    price: "£149",
    summary: "Periodic human review.",
    detail:
      "Ongoing intelligent support with a professional perspective to help your organisation stay on track.",
  },
  {
    id: "director",
    name: "Director",
    price: "£495",
    summary: "Your ongoing human adviser.",
    detail:
      "More hands-on personal involvement, strategic input and regular interaction with an experienced professional.",
  },
  {
    id: "bespoke",
    name: "Bespoke",
    price: "£1,500+",
    summary: "Tailored senior support.",
    detail:
      "For larger or more complex organisations: potentially greater senior involvement, additional analysis, leadership engagement and custom projects.",
  },
] as const;
