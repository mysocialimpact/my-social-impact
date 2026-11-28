import Image from "next/image";
import { REPORT_VERSION } from "@/lib/report-methodology";
import { identity } from "@/lib/publication";
import { frameworkNames, type Framework } from "@/lib/rubric";

const frameworkIntros = {
  claims: {
    heading: "Make the strongest claim the evidence allows.",
    emphasis: "No stronger.",
    description:
      "The Social Impact Claims Code, developed by My Social Impact, helps organisations make claims about the difference they create that people can genuinely trust.",
    criteria: [
      ["Evidence", "Are important claims supported?"],
      ["Proportion", "Are claims no stronger than their evidence?"],
      [
        "Transparency",
        "Can readers understand the evidence, methods and limitations?",
      ],
      [
        "Balance",
        "Does the report provide a fair picture, including challenges?",
      ],
      [
        "Learning",
        "Does the organisation acknowledge lessons and explain how it intends to improve?",
      ],
    ],
    methodology:
      "AI identifies important claims, scrutinises the supporting evidence and considers its limitations. It then assesses whether each claim goes as far as the evidence allows.",
    limitation:
      "The review offers an assessment of the published evidence. Independent certification or assurance requires a separate professional engagement.",
  },
  excellence: {
    heading: "Great impact doesn’t happen by accident.",
    emphasis: "",
    description:
      "This assessment examines what the published report demonstrates about how your organisation understands, manages and communicates its social impact. Its scope is what the report shows.",
    criteria: [
      ["Purpose", "Knowing the difference the organisation intends to make."],
      ["Leadership", "Taking responsibility for impact."],
      ["Data", "Understanding and measuring progress."],
      ["Delivery", "Translating purpose into meaningful action and results."],
      ["Communications", "Explaining impact clearly and credibly."],
    ],
    methodology:
      "AI examines what the published report demonstrates about impact management, from the organisation’s stated purpose to how it explains its progress.",
    limitation:
      "Practices may go beyond what the report describes. An organisational audit would require further evidence and direct engagement.",
  },
  report: {
    heading: "Your impact deserves to be seen.",
    emphasis: "",
    description:
      "A compelling impact report should do more than contain good information. It should make that information clear, engaging and memorable. This creative and editorial assessment considers how the report’s actual pages look, read and communicate.",
    criteria: [
      ["Readability & Copy", "How easily readers can understand the writing."],
      [
        "Information Hierarchy",
        "How clearly the report directs readers to what matters.",
      ],
      ["Visual Design", "How the visual choices support the report’s purpose."],
      [
        "Storytelling",
        "How well the narrative connects evidence and experience.",
      ],
      [
        "Data Presentation",
        "How clearly charts, tables and figures communicate the evidence.",
      ],
    ],
    methodology:
      "AI applies visual and editorial judgement to how the report communicates, considering what the writing, layouts, imagery and data presentation do for the reader.",
    limitation:
      "Creative judgement is partly subjective. The assessment is a beta editorial review, and formal accessibility testing has its own requirements.",
  },
} as const;

export function ReportIntroduction({
  framework,
  version,
}: {
  framework: Framework;
  version: string;
}) {
  const intro = frameworkIntros[framework];
  return (
    <header className={"report-introduction report-introduction-" + framework}>
      <div className="report-introduction-lead">
        <div className="report-introduction-copy">
          <p className="report-introduction-name">
            {frameworkNames[framework]}
          </p>
          <h1>
            {intro.heading}
            {intro.emphasis && (
              <>
                {" "}
                <em>{intro.emphasis}</em>
              </>
            )}
          </h1>
          <p>{intro.description}</p>
        </div>
        <div className="report-introduction-brand">
          <Image
            src={"/brand/" + identity[framework].logo}
            alt=""
            width={framework === "report" ? 420 : 180}
            height={framework === "report" ? 280 : 180}
            sizes="(max-width: 650px) 70vw, 30vw"
          />
          {framework === "claims" && (
            <Image
              src="/brand/my-social-impact.png"
              alt="My Social Impact"
              width={160}
              height={18}
            />
          )}
        </div>
      </div>
      <dl className="report-introduction-criteria">
        {intro.criteria.map(([name, purpose]) => (
          <div key={name}>
            <dt>{name}</dt>
            <dd>{purpose}</dd>
          </div>
        ))}
      </dl>
      <div className="report-introduction-footer">
        <a href="#assessment-scores">
          See the assessment scores <span aria-hidden="true">↓</span>
        </a>
        <small>Methodology {version}</small>
      </div>
      {framework === "report" && version !== REPORT_VERSION && (
        <p className="report-introduction-version-note">
          The current framework is shown above. Your saved assessment below uses
          the criteria from its original methodology.
        </p>
      )}
    </header>
  );
}

export function ReviewMethodology({
  framework,
  models = [],
  legacyDesign = false,
}: {
  framework: Framework;
  models?: readonly string[];
  legacyDesign?: boolean;
}) {
  const intro = frameworkIntros[framework];
  return (
    <section
      className="review-method-snapshot"
      aria-labelledby="review-method-title"
    >
      <h2 id="review-method-title">The intelligence behind your review.</h2>
      <div>
        <p>
          My Social Impact developed the professional principles behind this
          framework.{" "}
          {framework === "report" && legacyDesign
            ? "This saved version used AI to assess the publication using its original set of editorial criteria."
            : intro.methodology}
        </p>
        <p>{intro.limitation}</p>
        <dl>
          <div>
            <dt>Human review</dt>
            <dd>The standard AI assessment does not include human review.</dd>
          </div>
          {models.length > 0 && (
            <div>
              <dt>
                {models.length === 1 ? "AI model used" : "AI models used"}
              </dt>
              <dd>{models.join(", ")}</dd>
            </div>
          )}
        </dl>
      </div>
    </section>
  );
}
