import { criteria } from "../../src/lib/rubric";
import type { Criterion } from "../../src/lib/assessment";
export const firstOpinion = (numbers = [1, 2]) => {
  const d = {
    judgement: "good" as const,
    explanation:
      "A synthetic visual observation used only to validate the application contract and page references.",
    pages: [1],
  };
  return {
    firstImpression:
      "A synthetic professional-perspective review, not a real independent editorial judgement.",
    verdict:
      "This fictional example is readable but its visual design needs work; these observations test control flow only.",
    dimensions: {
      readability: d,
      hierarchy: d,
      design: { ...d, judgement: "weak" as const },
      storytelling: d,
      data: d,
    },
    strengths: [
      {
        finding:
          "The synthetic text explains its purpose clearly on the first physical page.",
        pages: [1],
      },
    ],
    weaknesses: [
      {
        finding:
          "The synthetic design hierarchy does not clearly distinguish the main finding.",
        pages: [1],
      },
    ],
    opportunities: [
      {
        finding:
          "Strengthen the hierarchy on the first page and make the opening easier to scan.",
        pages: [1],
      },
    ],
    observations: numbers.map((page) => ({
      page,
      description:
        "Synthetic page observation used to prove that every actual page image is transported before scores.",
      limitations: "Synthetic contract only.",
      readable: true,
      contentKinds: [] as [],
    })),
    limitations: ["Synthetic contract, not professional calibration."],
  };
};
export const testFindings = (score = 3): Criterion[] =>
  criteria("report", "2.1.0").map((c) => ({
    id: c.id,
    status: "assessed",
    score,
    explanation:
      "Synthetic evidence-grounded execution finding for application validation only.",
    evidence: [
      { page: 1, quote: "Synthetic community housing advice report." },
    ],
    visualPages: [1],
    limitations: ["Synthetic contract only."],
    improvement:
      "Make the most important message easier to locate at the start.",
    confidence: "medium",
    claimIds: [],
    anchorReason:
      "This fits anchor 3, professionally effective execution; anchor 4 is not justified because exceptional reader benefit was not demonstrated.",
    barrier: "none",
  }));
