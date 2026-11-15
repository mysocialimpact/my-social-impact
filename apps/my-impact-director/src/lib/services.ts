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
    name: "Impact Report Preparation",
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
    name: "Impact Report Digitisation",
    heading: "Your report deserves more than a PDF.",
    intro:
      "Turn your existing impact report into an engaging, interactive digital experience that helps more people explore, understand and connect with your impact.",
    benefits: [
      "An accessible experience across phones, tablets and desktops",
      "Interactive presentation and useful data visualisation",
      "More ways for your audience to discover the story behind the evidence",
    ],
  },
} as const;
export type Service = keyof typeof services;
