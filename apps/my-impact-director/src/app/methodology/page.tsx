import Image from "next/image";
import Link from "next/link";
import { PageIntro } from "@/components/shell";
import { CreativeCaveat } from "@/components/creative-caveat";
import { rubrics, VERSION, ANCHORS, frameworkNames } from "@/lib/rubric";
export default function Methodology() {
  return (
    <div className="section methodology-overview">
      <section id="overview" className="content-prose">
        <PageIntro
          label={`Our methodology · Version ${VERSION}`}
          title="Evidence before scores."
        >
          <p>
            Three different questions. Transparent methods. Specific
            observations from your actual report.
          </p>
        </PageIntro>
        <p>
          We extract the PDF’s content and map physical page numbers, using
          visual transcription for scans, charts and tables. Shared document
          understanding identifies the context and material impact claims. Each
          methodology then asks its own questions.
        </p>
        <p>
          We check quoted evidence against the extracted pages, calculate scores
          in application code and prepare practical recommendations. Visual
          transcription can make mistakes; page references help you check the
          source but do not independently verify the underlying data.
        </p>
      </section>
      {(["claims", "excellence"] as const).map((f) => (
        <section id={f} className="methodology-family content-prose" key={f}>
          <Image
            src={
              f === "claims"
                ? "/brand/claims-code.png"
                : "/brand/excellence.png"
            }
            width={110}
            height={110}
            alt={frameworkNames[f]}
          />
          <p className="eyebrow">
            {f === "claims"
              ? "Can we trust the claims?"
              : "How is impact managed?"}
          </p>
          <h2>{frameworkNames[f]}</h2>
          <p>
            {f === "claims"
              ? "We examine the credibility, proportionality, transparency and integrity of the report’s material impact claims. Stronger claims need appropriately stronger evidence."
              : "We examine what the report demonstrates about understanding, managing and communicating impact. This is separate from the full Social Impact Excellence Maturity Assessment."}
          </p>
          {rubrics[f].map(([name, ...questions]) => (
            <details className="finding" key={name}>
              <summary>{name}</summary>
              <div className="finding-content">
                <ol>
                  {questions.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ol>
              </div>
            </details>
          ))}
        </section>
      ))}
      <section
        id="impact-edit"
        className="methodology-family impact-edit-feature content-prose"
      >
        <Image
          src="/brand/impact-design-review-artwork.webp"
          width={500}
          height={120}
          alt="The Impact Design Review"
        />
        <p className="eyebrow">Does your impact report make an impact?</p>
        <h2>The Impact Design Review.</h2>
        <p>
          Readability & Copy. Information Hierarchy. Visual Design.
          Storytelling. Data Presentation. Twenty-five criteria examine how
          effectively your report communicates, including inspection of its
          actual page design.
        </p>
        <CreativeCaveat />
        <Link
          className="text-link"
          href="/methodology/impact-report-excellence"
        >
          Read The Impact Design Review Methodology v2.0 — beta →
        </Link>
      </section>
      <section id="scoring" className="methodology-family content-prose">
        <h2>Clear scores. Honest limits.</h2>
        <p>
          Each of the five pillars contributes up to 20 points. The Claims Code
          and Social Impact Excellence each have four tests per pillar. The
          Impact Design Review has five.
        </p>
        <table className="rubric-table">
          <thead>
            <tr>
              <th scope="col">Score</th>
              <th scope="col">What the report demonstrates</th>
            </tr>
          </thead>
          <tbody>
            {ANCHORS.map((a, i) => (
              <tr key={a}>
                <th scope="row">{i}</th>
                <td>{a}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          For Claims Code and Social Impact Excellence, fully assessable test
          scores are added and multiplied by 1.25. When tests are genuinely
          inapplicable or unassessable, the pillar score is the average of
          assessable tests multiplied by five. Overall scores require at least
          three assessable tests per pillar and sixteen overall.
        </p>
        <p>
          The Impact Design Review adds its five fully assessable criterion
          scores directly to give each pillar’s score out of twenty. With
          exclusions it normalises the remaining scores to twenty. An overall
          indicative creative score requires at least four assessable criteria
          per pillar, twenty-two overall and actual visual inspection. Otherwise
          the review is provisional.
        </p>
        <h3>Missing is not the same as inapplicable.</h3>
        <ul>
          <li>
            <strong>Not demonstrated:</strong> relevant information is expected
            but not shown in a readable report. It can receive zero.
          </li>
          <li>
            <strong>Not applicable:</strong> genuinely irrelevant to the
            context. Excluded with an explanation.
          </li>
          <li>
            <strong>Unassessable:</strong> available material cannot support a
            reliable judgement. Excluded with a stated limitation.
          </li>
        </ul>
        <p>
          A small or modestly designed report can score strongly. We judge
          evidence in proportion to the claim. Material concerns inform relevant
          judgements; there are no hidden score caps.
        </p>
        <h3>What a report cannot establish.</h3>
        <p>
          These automated reviews are not professional assurance, certification
          or independent verification. They cannot establish underlying data
          accuracy, infer undisclosed internal practice or prove causation.
          Engineering checks verify calculations and source references; they do
          not replace human professional calibration. Each review retains its
          original methodology version.
        </p>
        <p>
          <a href="https://mysocialimpact.org/social-impact-claims-code">
            Published Social Impact Claims Code
          </a>{" "}
          ·{" "}
          <a href="https://socialimpactexcellence.org">
            Full Social Impact Excellence assessment
          </a>{" "}
          ·{" "}
          <Link href="/services/expert-review">
            Discuss a professional human review
          </Link>
        </p>
      </section>
    </div>
  );
}
