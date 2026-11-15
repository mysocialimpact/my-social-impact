import { PageIntro } from "@/components/shell";
import {
  rubrics,
  VERSION,
  ANCHORS,
  frameworkNames,
  type Framework,
} from "@/lib/rubric";
export default function Methodology() {
  return (
    <section className="section">
      <PageIntro
        label={`Our methodology · Version ${VERSION}`}
        title="Evidence before scores."
      >
        <p>
          A useful review should show its working. Here’s what we look for, how
          the scores are calculated and what a report alone cannot tell us.
        </p>
      </PageIntro>
      <div className="content-prose">
        <h2>Two different questions</h2>
        <p>
          The <strong>Social Impact Claims Code Review</strong> examines the
          credibility, proportionality, transparency and integrity of impact
          claims. The <strong>Social Impact Excellence Review</strong> examines
          what the report demonstrates about understanding, managing and
          communicating impact.
        </p>
        <p>
          Neither review establishes an organisation’s actual impact or
          undisclosed practice. The Excellence review is separate from the full{" "}
          <a href="https://socialimpactexcellence.org">
            Social Impact Excellence Maturity Assessment
          </a>
          .
        </p>
        <h2>How the review works</h2>
        <ol>
          <li>
            We extract the PDF’s content and map physical page numbers, using
            visual transcription for scans, charts and tables.
          </li>
          <li>
            We identify the reporting context, material impact claims and the
            evidence that supports them.
          </li>
          <li>
            We assess four detailed tests under each of five principles in each
            framework.
          </li>
          <li>
            We check quoted evidence against the extracted pages, calculate
            scores in application code and prepare specific recommendations.
          </li>
        </ol>
        <p>
          Visual transcription can make mistakes. Page references and extracts
          help you check the source, but they do not independently verify the
          underlying data.
        </p>
        <h2>What the scores mean</h2>
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
          Each principle contributes up to 20 points. With all four tests
          assessable, we add their scores and multiply by 1.25. If a test is
          genuinely inapplicable or unassessable, the principle score is the
          average of its assessable scores multiplied by five.
        </p>
        <h3>Missing is not the same as inapplicable</h3>
        <ul>
          <li>
            <strong>Not demonstrated:</strong> relevant information is expected
            but not shown in a readable report. It can receive zero.
          </li>
          <li>
            <strong>Not applicable:</strong> a test is genuinely irrelevant to
            the context. We exclude it and explain why.
          </li>
          <li>
            <strong>Unassessable:</strong> available material cannot support a
            reliable judgement. We exclude it and state the limitation.
          </li>
        </ul>
        <p>
          We do not give a definitive overall numerical score unless every
          principle has at least three assessable tests and at least 16 of the
          framework’s 20 tests are assessable. Otherwise, the review is
          provisional and shows its coverage.
        </p>
        <h2>Proportionate to the claim</h2>
        <p>
          A short, modestly designed report from a small organisation can score
          strongly. We look for evidence appropriate to the nature and
          significance of its claims, not expensive research or polished design
          for its own sake.
        </p>
        <p>
          Material concerns such as unsupported causal claims or confusion
          between participation and outcomes are highlighted separately. They
          inform relevant judgements; we do not apply hidden score caps.
        </p>
        {(["claims", "excellence"] as Framework[]).map((f) => (
          <section key={f}>
            <h2>{frameworkNames[f]}</h2>
            {rubrics[f].map(([name, ...questions]) => (
              <details className="finding" key={name}>
                <summary>
                  <span>{name}</span>
                </summary>
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
        <h2>What this review cannot establish</h2>
        <p>
          An automated review is not professional assurance, certification or
          independent verification. We cannot establish that the underlying data
          is accurate, infer missing internal practices, or prove an
          organisation caused a change from its report alone.
        </p>
        <p>
          Methodology 1.0 is an initial, version-controlled assessment approach.
          Engineering checks verify calculations and source references. They do
          not replace human professional calibration. We retain the methodology
          version with each review so changes remain transparent.
        </p>
        <p>
          Read the{" "}
          <a href="https://mysocialimpact.org/social-impact-claims-code">
            published Social Impact Claims Code
          </a>{" "}
          or <a href="/services/expert-review">discuss a professional review</a>
          .
        </p>
      </div>
    </section>
  );
}
