import { displayScore } from "@/lib/publication";
import type { ReportRating } from "@/lib/report-verdict";
import {
  REPORT_VERSION,
  isReportV2,
  isRevisedReport,
  pillarMaximum,
} from "@/lib/report-methodology";
import Link from "next/link";
import { CreativeCaveat } from "./creative-caveat";
import type { ReviewResult } from "@/lib/pipeline";
import type { Criterion, Scores } from "@/lib/assessment";
import { disputeFinding } from "./feedback";
import { criteria, frameworkNames, type Framework } from "@/lib/rubric";
import { Arrow } from "./icons";
export function ScoreCard({
  framework,
  score,
  version,
  rating,
}: {
  framework: Framework;
  score: Scores;
  version?: string;
  rating?: ReportRating;
}) {
  return (
    <article className={"score-card score-" + framework}>
      <p className="eyebrow">
        {framework === "claims"
          ? "The credibility of your claims"
          : framework === "report"
            ? "Indicative Creative Assessment"
            : "What your report demonstrates"}
      </p>
      <h2>{frameworkNames[framework]}</h2>
      <div className="score-display">
        <div className="score-dial">
          <svg viewBox="0 0 160 160" aria-hidden="true">
            <circle cx="80" cy="80" r="68" className="dial-track" />
            <circle
              cx="80"
              cy="80"
              r="68"
              className="dial-value"
              pathLength="100"
              strokeDasharray={`${score.overall || 0} 100`}
              transform="rotate(-90 80 80)"
            />
          </svg>
          <div
            className={
              "score-value " + (score.provisional ? "provisional" : "")
            }
          >
            {score.provisional
              ? "—"
              : (displayScore(score.unroundedOverall ?? score.overall)
                  ?.percent ?? "—")}
            <span>
              {score.provisional || score.overall === null
                ? "unavailable"
                : "/100 · " +
                  displayScore(score.unroundedOverall ?? score.overall)?.label}
            </span>
          </div>
        </div>
        <p>
          {score.provisional
            ? framework === "report" && isRevisedReport(version)
              ? "This indicative assessment needs sufficient coverage, visual inspection and consistent findings before an overall score can be shown."
              : "More reliable evidence is needed for an overall result."
            : "An indicative assessment of the evidence in your report."}
        </p>
      </div>
      <p>
        {score.coverage}/{criteria(framework, version).length} tests assessed.{" "}
        {score.provisional
          ? framework === "report" && isRevisedReport(version)
            ? "The overall score requires complete coverage and consistency checks."
            : "Coverage is too limited for a definitive overall score."
          : "An assessment of the evidence in this report."}
      </p>
      {rating && (
        <div>
          <h3>{rating.label}</h3>
          {rating.reasons.map((reason) => (
            <p key={reason}>{reason}</p>
          ))}
          <details>
            <summary>How the rating is decided</summary>
            <p>{rating.rule}</p>
          </details>
        </div>
      )}
      <div className="bars">
        {score.principles.map((p) => (
          <div className="bar-row" key={p.name}>
            <div className="bar-label">
              <span>{p.name}</span>
              <strong>
                {p.score === null
                  ? "Not assessable"
                  : `${p.score} / ${pillarMaximum(p)} · ${displayScore(p.score, pillarMaximum(p))?.percent}% · ${displayScore(p.score, pillarMaximum(p))?.label}`}
              </strong>
            </div>
            <div className="bar-track" aria-hidden="true">
              <div
                className="bar-fill"
                style={{
                  width: `${((p.score || 0) / pillarMaximum(p)) * 100}%`,
                  backgroundColor: displayScore(p.score, pillarMaximum(p))
                    ?.colour,
                }}
              />
            </div>
            <small>
              {p.coverage}/{framework === "report" ? 5 : 4} tests assessed
            </small>
          </div>
        ))}
      </div>
    </article>
  );
}
function SourceLink({
  id,
  page,
  admin = false,
}: {
  id: string;
  page: number;
  admin?: boolean;
}) {
  if (!id) return <span>Source · PDF page {page}</span>;
  return admin ? (
    <a href={`#inspection-page-${page}`}>
      PDF page {page} · inspection below ↓
    </a>
  ) : (
    <Link href={`/reviews/${id}/source?page=${page}`}>
      View source · PDF page {page} <Arrow diagonal />
    </Link>
  );
}
function Finding({
  f,
  framework,
  id,
  admin,
  version,
}: {
  f: Criterion;
  version?: string;
  framework: Framework;
  id: string;
  admin: boolean;
}) {
  return (
    <details className="finding" id={f.id}>
      <summary>
        <span>
          {criteria(framework, version).find((c) => c.id === f.id)?.question}
        </span>
        <small>
          {f.score === null
            ? f.status.replaceAll("_", " ")
            : `${f.score}/4 · ${displayScore(f.score, 4)?.label}`}
        </small>
      </summary>
      <div className="finding-content">
        <span className="badge">
          {f.status.replaceAll("_", " ")} · {f.confidence} confidence
        </span>
        <p style={{ marginTop: 15 }}>{f.explanation}</p>
        {f.anchorReason && (
          <p>
            <strong>Why this score:</strong> {f.anchorReason}
          </p>
        )}
        {f.barrier === "serious" && (
          <p className="alert error">
            Serious unresolved readability or accessibility barrier.
          </p>
        )}
        {f.visualPages?.map((page) => (
          <p key={page}>
            Visual observation ·{" "}
            <SourceLink id={id} page={page} admin={admin} />
          </p>
        ))}
        {f.evidence.map((e, i) => (
          <div className="citation" key={i}>
            <blockquote>“{e.quote}”</blockquote>
            <SourceLink id={id} page={e.page} admin={admin} />
          </div>
        ))}
        {f.limitations.length > 0 && (
          <div className="limitations">
            <strong>Limits to this finding</strong>
            <ul>
              {f.limitations.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          </div>
        )}
        <h4>A practical improvement</h4>
        <p>{f.improvement}</p>
        {!admin && (
          <button
            type="button"
            className="dispute-link"
            onClick={() => disputeFinding("criterion-" + f.id)}
          >
            Question this finding
          </button>
        )}
        {f.claimIds.length > 0 && (
          <small>Related material claims: {f.claimIds.join(", ")}</small>
        )}
      </div>
    </details>
  );
}
export function ReviewResults({
  result,
  id,
  admin = false,
  appendix = false,
}: {
  result: ReviewResult;
  id: string;
  admin?: boolean;
  appendix?: boolean;
}) {
  return (
    <>
      <div className="result-meta">
        {result.context.reportingPeriod || "Reporting period not identified"} ·
        Assessed {new Date(result.assessedAt).toLocaleDateString("en-GB")} ·
        Methodology {result.version}
        {result.framework === "report" && (
          <>
            {" "}
            ·{" "}
            <Link
              href={
                isReportV2(result.version)
                  ? isRevisedReport(result.version)
                    ? result.version.startsWith("2.0.1")
                      ? "/methodology/impact-report-excellence/v2-0-1"
                      : "/methodology/impact-report-excellence"
                    : "/methodology/impact-report-excellence/v2-0-0"
                  : "/methodology/impact-report-excellence/v1"
              }
            >
              Read this methodology
            </Link>
          </>
        )}
      </div>
      {!appendix && (
        <div className="results-grid">
          {(["claims", "excellence", "report"] as Framework[])
            .filter((f) => !!result.scores[f])
            .map((f) => (
              <ScoreCard
                key={f}
                framework={f}
                score={result.scores[f]!}
                version={result.version}
                rating={f === "report" ? result.rating : undefined}
              />
            ))}
        </div>
      )}
      {result.qualityControl && (
        <details className="finding">
          <summary>Editorial quality control: the criterion audit</summary>
          <div className="finding-content">
            <p>
              A final AI-assisted audit challenges execution judgements against
              the rubric before aggregation. This is not independent human
              validation. {result.qualityControl.changes.length} criterion
              scores were revised from their evidence; the overall score was
              never chosen independently.
            </p>
            {result.qualityControl.changes.map((c) => (
              <p key={c.id}>
                <strong>
                  {c.id}: {c.before ?? "Unassessable"} →{" "}
                  {c.after ?? "Unassessable"}.
                </strong>{" "}
                {c.reason}
              </p>
            ))}
          </div>
        </details>
      )}
      {result.artDirector && (
        <details className="finding">
          <summary>The AI art director’s first reading</summary>
          <div className="finding-content">
            <p>
              This visual editorial opinion was recorded before criterion scores
              were generated. No previous assessment score was supplied.
            </p>
            <h3>First impression</h3>
            <p>{result.artDirector.review.firstImpression}</p>
            <p>{result.artDirector.review.verdict}</p>
            {Object.entries(result.artDirector.review.dimensions).map(
              ([key, item]) => (
                <p key={key}>
                  <strong>
                    {key}: {item.judgement.replaceAll("_", " ")}.
                  </strong>{" "}
                  {item.explanation} · Physical pages {item.pages.join(", ")}
                </p>
              ),
            )}
            <p>
              {result.artDirector.requiredPages.length} of{" "}
              {result.visualInspection?.totalPages} physical pages supplied for
              visual inspection.
            </p>
          </div>
        </details>
      )}
      {result.assessmentProcess && (
        <details className="finding">
          <summary>Saved assessment record</summary>
          <div className="finding-content">
            <p>
              Methodology {result.version}.{" "}
              {result.assessmentProcess.models.join(" · ")}. Prompt{" "}
              {result.assessmentProcess.promptVersion}.
            </p>
            <p>
              Generated {new Date(result.assessedAt).toLocaleString("en-GB")}.
              Reopening this result shows its saved judgement; it does not run
              the models again.
            </p>
          </div>
        </details>
      )}
      {result.readerInspection && (
        <details className="finding">
          <summary>Before scoring: the AI-simulated reading exercise</summary>
          <div className="finding-content">
            <p>{result.readerInspection.firstImpression}</p>
            <p>{result.readerInspection.readingExperience}</p>
            <p>This is an AI-simulated scan, not a human usability study.</p>
            {Object.entries(result.readerInspection.scan).map(([key, a]) => (
              <p key={key}>
                <strong>{key}:</strong> {a.finding} ·{" "}
                {a.access.replaceAll("_", " ")}
                {a.page !== null && (
                  <>
                    {" "}
                    · <SourceLink id={id} page={a.page} admin={admin} />
                  </>
                )}
              </p>
            ))}
            {result.readerInspection.accessibilityConcerns.map((x) => (
              <p key={x}>{x}</p>
            ))}
          </div>
        </details>
      )}
      {result.editorial && (
        <section className="result-section">
          <h2>Whole-report editorial verdict</h2>
          <p>{result.editorial.verdict}</p>
          <p>{result.editorial.attention}</p>
          {result.rating && (
            <>
              <h3>Historical methodology rating: {result.rating.label}</h3>
              <p>{result.rating.rule}</p>
              {result.rating.reasons.map((reason, i) => (
                <p key={i}>{reason}</p>
              ))}
            </>
          )}
          <h3>The two-minute reader test</h3>
          <p>
            A simulated editorial scan, not a timed user test. Can a new reader
            quickly find the main outcomes, their scale, limitations and next
            steps?
          </p>
          {Object.entries(result.editorial.readerTest).map(([key, a]) => (
            <div key={key}>
              <h4>
                {key === "nextSteps"
                  ? "Next steps"
                  : key.charAt(0).toUpperCase() + key.slice(1)}
              </h4>
              <p>
                {a.finding} · {a.access.replaceAll("_", " ")}
                {a.page !== null ? ` · PDF page ${a.page}` : ""}
              </p>
            </div>
          ))}
          <p>
            <strong>Score consistency:</strong>{" "}
            {result.editorial.scoreExplanation}
          </p>
        </section>
      )}
      <div className="summary-box">
        <h2>The evidence at a glance</h2>
        <p>{result.actions.summary}</p>
        <div className="strength-grid">
          <div>
            <h3>What’s working</h3>
            <ul>
              {result.actions.strengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Where to focus next</h3>
            <ul>
              {result.actions.opportunities.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      {result.claims.some((c) => c.exaggerationRisk === "high") && (
        <aside className="priority-concerns">
          <p className="eyebrow">LOOK CLOSELY AT THESE CLAIMS</p>
          <h2>Where the wording may run ahead of the evidence.</h2>
          <ul>
            {result.claims
              .filter((c) => c.exaggerationRisk === "high")
              .slice(0, 3)
              .map((c) => (
                <li key={c.id}>
                  <strong>{c.outcome}</strong>
                  <details className="source-excerpt">
                    <summary>Read the exact source passage</summary>
                    <blockquote>“{c.text}”</blockquote>
                  </details>
                  <p>{c.defensibleWording || c.outcome}</p>
                  <SourceLink id={id} page={c.page} admin={admin} />
                </li>
              ))}
          </ul>
        </aside>
      )}
      <nav className="tabs-nav" aria-label="Review sections">
        {result.scores.claims && <a href="#claims">Claims Code</a>}
        {result.scores.excellence && <a href="#excellence">Excellence</a>}
        {result.scores.report && <a href="#report">The Impact Design Review</a>}
        {!result.scores.report && (
          <a href="#claims-register">Material claims</a>
        )}
        <a href="#actions">Your action plan</a>
      </nav>
      <section className="result-section" id="actions">
        <p className="eyebrow">From insight to action</p>
        <h2>Your next, better report starts here.</h2>
        <div className="actions-grid">
          {[
            ["quick", "Quick improvements"],
            ["important", "Important reporting improvements"],
            ["longer_term", "Longer-term improvements"],
          ].map(([key, name]) => (
            <div className="action-group" key={key}>
              <h3>{name}</h3>
              {result.actions.actions
                .filter((a) => a.priority === key)
                .map((a, i) => (
                  <article key={i}>
                    <h4>{a.title}</h4>
                    <p>{a.detail}</p>
                    <small>
                      Related tests:{" "}
                      {a.criterionIds.map((c, i) => (
                        <span key={c}>
                          {i > 0 ? ", " : ""}
                          <a href={"#" + c}>{c}</a>
                        </span>
                      ))}
                    </small>
                  </article>
                ))}
              {!result.actions.actions.some((a) => a.priority === key) && (
                <p>No specific actions in this group.</p>
              )}
            </div>
          ))}
        </div>
      </section>
      {(["claims", "excellence", "report"] as Framework[])
        .filter((f) => !!result.scores[f])
        .map((framework) => (
          <section className="result-section" id={framework} key={framework}>
            <p className="eyebrow">
              {framework === "claims"
                ? "01 · Credibility & integrity"
                : framework === "report"
                  ? "03 · Editorial & creative review"
                  : "02 · Understanding, managing & communicating"}
            </p>
            <h2>{frameworkNames[framework]} Review</h2>
            {framework === "report" && (
              <CreativeCaveat version={result.version} />
            )}
            <p>
              {framework === "claims"
                ? "How responsibly the report makes and supports its material impact claims."
                : framework === "report"
                  ? isReportV2(result.version)
                    ? isRevisedReport(result.version)
                      ? "Readability & Copy, Information Hierarchy, Visual Design, Storytelling and Data Presentation, grounded in inspected physical pages."
                      : "Readability and hierarchy, storytelling, visual design, data communication and accessibility, grounded in inspected physical pages."
                    : "Clarity, storytelling, design, engagement and communication, grounded in inspected physical pages."
                  : "What the report demonstrates about impact management. This is not the full organisational maturity assessment."}
            </p>
            {result.scores[framework]!.principles.map((p) => (
              <div className="principle" key={p.name}>
                <h3>
                  {p.name}{" "}
                  <span className="badge">
                    {p.score === null
                      ? "Unassessable"
                      : `${p.score}/${pillarMaximum(p)} · ${displayScore(p.score, pillarMaximum(p))?.percent}% · ${displayScore(p.score, pillarMaximum(p))?.label}`}{" "}
                    · {p.coverage}/{framework === "report" ? 5 : 4} tests
                  </span>
                </h3>
                {p.tests.map((f) => (
                  <Finding
                    key={f.id}
                    f={f}
                    framework={framework}
                    id={id}
                    admin={admin}
                    version={result.version}
                  />
                ))}
              </div>
            ))}
            {framework === "excellence" && (
              <a
                className="text-link"
                href="https://socialimpactexcellence.org"
              >
                Explore the full maturity assessment <Arrow diagonal />
              </a>
            )}
          </section>
        ))}
      {result.pdfChecks && (
        <section className="result-section">
          <h2>Accessibility: checked and not checked</h2>
          <p>
            PDF tagging:{" "}
            {result.pdfChecks.tagged === null
              ? "unknown"
              : result.pdfChecks.tagged
                ? "present; quality assessed separately"
                : "not present"}
            . A tag flag does not prove accessible reading.
          </p>
          <h3>Checked</h3>
          <ul>
            {result.pdfChecks.verified.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <h3>Not verified</h3>
          <ul>
            {result.pdfChecks.notVerified.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </section>
      )}
      {result.visualInspection && (
        <section className="result-section">
          <h2>Visual inspection coverage</h2>
          <p>
            Rendered at {result.visualInspection.resolution}px width. Physical
            pages inspected: {result.visualInspection.pages.join(", ")} of{" "}
            {result.visualInspection.totalPages}. Longer documents use
            representative and targeted sampling; unseen pages are not visually
            verified.
          </p>
          {result.visualInspection.normalComparisonPages?.length && (
            <p>
              Normal-size 96dpi and enlarged renderings were compared on PDF
              pages {result.visualInspection.normalComparisonPages.join(", ")}.
              Interactive zoom, reflow and assistive-user behaviour were not
              functionally tested.
            </p>
          )}
          {result.visualInspection.observations.map((o) => (
            <details key={o.page}>
              <summary>PDF page {o.page} · visual observations</summary>
              <p>{o.description}</p>
              <p>{o.limitations}</p>
              <SourceLink id={id} page={o.page} admin={admin} />
            </details>
          ))}
          <h3>Suggested creative direction</h3>
          <p>
            {result.creativeDirection ||
              result.actions.actions[result.actions.actions.length - 1]?.detail}
          </p>
        </section>
      )}
      {!result.scores.report && (
        <section className="result-section" id="claims-register">
          <p className="eyebrow">Look behind the headline</p>
          <h2>Your material claims register</h2>
          <p>
            These are the significant claims identified in the report. Risks are
            shown separately from numerical scores.
          </p>
          {!result.claims.length && (
            <p>
              No material impact claims were identified in the readable report.
            </p>
          )}
          {result.claims.map((c) => (
            <details className="finding" key={c.id}>
              <summary>
                <span>
                  {c.id} ·{" "}
                  {c.outcome.length > 150
                    ? c.outcome.slice(0, 147) + "…"
                    : c.outcome}
                </span>
                <small>{c.exaggerationRisk} risk</small>
              </summary>
              <div className="finding-content">
                <p>
                  <span className="badge">{c.materiality} materiality</span>{" "}
                  {c.classification} · Evidence: {c.adequacy} · Causality{" "}
                  {c.causal ? "asserted" : "not asserted"}
                </p>
                <p>{c.outcome}</p>
                <blockquote>“{c.text}”</blockquote>
                <SourceLink id={id} page={c.page} admin={admin} />
                {c.evidence.map((e, i) => (
                  <div className="citation" key={i}>
                    <blockquote>“{e.quote}”</blockquote>
                    <SourceLink id={id} page={e.page} admin={admin} />
                  </div>
                ))}
                {c.assumptions.length > 0 && (
                  <>
                    <h4>Assumptions & limitations</h4>
                    <ul>
                      {c.assumptions.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </>
                )}
                {c.defensibleWording && (
                  <>
                    <h4>A more defensible way to say it</h4>
                    <p>{c.defensibleWording}</p>
                  </>
                )}
              </div>
            </details>
          ))}
        </section>
      )}
      <details className="finding">
        <summary>
          <span>Methodology, coverage and limitations</span>
        </summary>
        <div className="finding-content">
          <ul>
            {result.limitations.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
          <Link href="/methodology">Read the full scoring methodology →</Link>
        </div>
      </details>
      {id && !admin && !appendix && (
        <div className="support-cta">
          <div>
            <h3>Want to go deeper?</h3>
            <p>Talk through your findings with an impact professional.</p>
          </div>
          <Link
            href={`/services/expert-review?review=${id}`}
            className="button primary"
          >
            Discuss my review <Arrow />
          </Link>
        </div>
      )}
    </>
  );
}
