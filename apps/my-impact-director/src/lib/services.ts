export const services = {
  discussion: {
    name: "Free introductory conversation",
    heading: "Let’s discuss your report.",
    intro:
      "Talk to an experienced My Social Impact professional about your findings and what could be improved. A free introductory conversation, with no obligation to purchase.",
    benefits: [
      "Understand your assessment",
      "Discuss the most useful next steps",
      "Decide whether professional help would be useful",
    ],
  },
  improvement: {
    name: "Improve or digitise my report",
    heading: "Let’s bring your report to life.",
    intro:
      "Creative improvements or a digital starter from £500 for a clearly scoped project: sharper writing, stronger storytelling, more effective design or an engaging online experience. Larger projects are quoted separately.",
    benefits: [
      "Structure, copy editing and storytelling",
      "Typography, layout and charts",
      "Clearer communication of findings; substantial research, rewriting or redesign quoted separately",
    ],
  },
  "expert-review": {
    name: "Expert Impact Report Review",
    heading: "A fresh pair of expert eyes.",
    intro:
      "Go deeper with a professional human review of your Claims Code, Social Impact Excellence or The Impact Edit findings. Discuss the evidence, editorial choices and practical improvements with our team.",
    benefits: [
      "Professional scrutiny of your most important impact claims",
      "A discussion of the evidence, context and limitations",
      "Human creative judgement on writing, storytelling, design and reader engagement",
      "Clear priorities for a more credible, useful report",
    ],
  },
  preparation: {
    name: "Create an Impact Report",
    heading: "A report that does your impact justice.",
    intro:
      "Complete impact reports from £1,000 for an appropriately scoped project. We can help review evidence, research meaningful outcomes, structure, write, design and publish your next report. Price depends on size, complexity, evidence and production needs.",
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
      "Digital report starter from £500. My Social Impact and The Ideas Shed can turn an agreed part of your PDF into a useful digital experience. A limited-scope one-day starter; larger or more sophisticated builds quoted separately.",
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
      "Someone in your corner, all year round. Experienced professionals combine judgement, strategic thinking and accountability with AI-assisted analysis. Human-led support is available now; the fuller agentic service is in development.",
    benefits: [
      "Someone who understands your purpose and priorities",
      "Help interpreting evidence and making better decisions",
      "An agreed level of ongoing personal involvement",
    ],
  },
  essentials: {
    name: "Essentials (retired)",
    heading: "A little guidance. A clearer direction.",
    intro:
      "This former package is no longer offered. Existing enquiry records are preserved; current support starts with Supported.",
    benefits: [
      "Primarily AI-enabled guidance",
      "Help organising priorities and next steps",
      "Routine personal meetings are not included in the concept",
    ],
  },
  supported: {
    name: "Supported",
    heading: "Regular guidance. Useful next steps.",
    intro:
      "From £149 per month, indicatively. Regular professional guidance: a defined check-in, practical advice, priority and progress reviews, and AI-assisted recommendations. Scope and frequency agreed together.",
    benefits: [
      "A professional perspective on your progress",
      "Help interpreting evidence and identifying improvements",
      "Periodic human review, with frequency agreed before engagement",
    ],
  },
  director: {
    name: "Director",
    heading: "A named adviser. A meaningful relationship.",
    intro:
      "From £495 per month, indicatively. A named experienced adviser, regular strategic conversations, measurement and reporting guidance, and progress reviews. Selected management or board involvement can be agreed within scope.",
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
      "From £1,500 per month, indicatively. Tailored support for larger or more complex organisations, with scope agreed together.",
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
    id: "supported",
    name: "Supported",
    price: "£149",
    summary: "Regular professional guidance.",
    detail:
      "A defined check-in, practical advice, priorities and progress reviews, with AI-assisted analysis. Frequency and scope agreed together.",
  },
  {
    id: "director",
    name: "Director",
    price: "£495",
    summary: "Your named experienced adviser.",
    detail:
      "Strategic conversations, measurement and reporting guidance, and leadership advice. Selected management or board involvement by agreement.",
  },
  {
    id: "bespoke",
    name: "Bespoke",
    price: "£1,500",
    summary: "Tailored senior involvement.",
    detail:
      "Strategic oversight, specialist analysis, management or board participation and additional projects. Exact commitments agreed together.",
  },
] as const;

export const activeServices = Object.entries(services).filter(
  ([id]) => id !== "essentials",
);
export const MARCUS_EMAIL = "marcus@mysocialimpact.org";
const subjects: Partial<Record<Service, string>> = {
  discussion: "Discuss my impact report",
  improvement: "Improve or digitise my report",
  digitisation: "Digitise my impact report",
  preparation: "Prepare my next impact report",
  "expert-review": "Discuss my impact report",
  consultancy: "Professional impact consultancy",
  "ai-readiness": "AI readiness advice",
};
export function serviceMailto(service: Service) {
  return `mailto:${MARCUS_EMAIL}?subject=${encodeURIComponent("My Impact Director — " + (subjects[service] || "Ongoing support enquiry"))}`;
}
export const reportOffers = [
  {
    service: "discussion",
    title: "Let’s discuss your report.",
    price: "Free introductory conversation",
    copy: "An experienced My Social Impact professional. Your findings, your questions and a useful next step. No obligation.",
    cta: "Let’s talk about your report",
  },
  {
    service: "improvement",
    title: "Let’s bring your report to life.",
    price: "From £500",
    copy: "Sharper writing, stronger storytelling, better design and charts — or an engaging digital experience. A focused creative improvement or digital starter, with scope agreed together.",
    cta: "Bring my report to life",
  },
  {
    service: "preparation",
    title: "Let’s make your next report.",
    price: "From £1,000",
    copy: "Evidence, research, structure, writing, design and publication support. A starting price for an appropriately scoped project; size, complexity and evidence needs shape the quote.",
    cta: "Let’s make your next report",
  },
] as const;

export const IDEAS_SHED_PROJECT =
  "https://www.theideasshed.com/project-in-a-day";
// Verified against the live project page, 16 November 2026. No live slot is promised here.
export function novemberOfferActive(now = new Date()) {
  return (
    now >= new Date("2026-11-01T00:00:00+00:00") &&
    now < new Date("2026-12-01T00:00:00+00:00")
  );
}

export function contactService(value: unknown): Service {
  return typeof value === "string" &&
    value !== "essentials" &&
    Object.hasOwn(services, value)
    ? (value as Service)
    : "discussion";
}
export function serviceContactUrl(service: Service) {
  return `/contact?service=${encodeURIComponent(service)}`;
}
export function contactContext(service: Service) {
  if (service === "discussion" || service === "expert-review")
    return "Discuss my report";
  if (service === "improvement" || service === "digitisation")
    return "Improve or digitise my report";
  if (service === "preparation") return "Prepare my next impact report";
  if (["human-director", "supported", "director", "bespoke"].includes(service))
    return (
      "Discuss ongoing Impact Director support" +
      (service === "human-director" ? "" : ` · ${services[service].name}`)
    );
  return services[service].name;
}
