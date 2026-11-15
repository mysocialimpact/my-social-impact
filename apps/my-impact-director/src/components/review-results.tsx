import Link from "next/link";
import type { ReviewResult } from "@/lib/pipeline";
import type { Criterion, Scores } from "@/lib/assessment";
import { criteria, frameworkNames, type Framework } from "@/lib/rubric";
import { Arrow } from "./icons";
export function ScoreCard({
  framework,
  score,
}: {
  framework: Framework;
  score: Scores;
}) {
  return (
    <article className={"score-card score-" + framework}>
      <p className="eyebrow">
        {framework === "claims"
          ? "The credibility of your claims"
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
            {score.provisional ? "—" : score.overall}
            <span>{score.provisional ? "provisional" : "out of 100"}</span>
          </div>
        </div>
        <p>
          {score.provisional
            ? "More reliable evidence is needed for an overall result."
            : "An indicative assessment of the evidence in your report."}
        </p>
      </div>
      <p>
        {score.coverage}/20 tests assessed.{" "}
        {score.provisional
          ? "Coverage is too limited for a definitive overall score."
          : "An assessment of the evidence in this report."}
      </p>
      <div className="bars">
        {score.principles.map((p) => (
          <div className="bar-row" key={p.name}>
            <div className="bar-label">
              <span>{p.name}</span>
              <strong>
                {p.score === null ? "Not assessable" : `${p.score} / 20`}
              </strong>
            </div>
            <div className="bar-track" aria-hidden="true">
              <div
                className="bar-fill"
                style={{ width: `${(p.score || 0) * 5}%` }}
              />
            </div>
            <small>{p.coverage}/4 tests assessed</small>
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
}: {
  f: Criterion;
  framework: Framework;
  id: string;
  admin: boolean;
}) {
  return (
    <details className="finding" id={f.id}>
      <summary>
        <span>{criteria(framework).find((c) => c.id === f.id)?.question}</span>
        <small>
          {f.score === null ? f.status.replaceAll("_", " ") : `${f.score}/4`}
        </small>
      </summary>
      <div className="finding-content">
        <span className="badge">
          {f.status.replaceAll("_", " ")} · {f.confidence} confidence
        </span>
        <p style={{ marginTop: 15 }}>{f.explanation}</p>
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
}: {
  result: ReviewResult;
  id: string;
  admin?: boolean;
}) {
  return (
    <>
      <div className="result-meta">
        {result.context.reportingPeriod || "Reporting period not identified"} ·
        Assessed {new Date(result.assessedAt).toLocaleDateString("en-GB")} ·
        Methodology {result.version}
      </div>
      <div className="results-grid">
        {(["claims", "excellence"] as Framework[])
          .filter((f) => !!result.scores[f])
          .map((f) => (
            <ScoreCard key={f} framework={f} score={result.scores[f]!} />
          ))}
      </div>
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
        <a href="#claims">Claims Code</a>
        <a href="#excellence">Excellence</a>
        <a href="#claims-register">Material claims</a>
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
      {(["claims", "excellence"] as Framework[])
        .filter((f) => !!result.scores[f])
        .map((framework) => (
          <section className="result-section" id={framework} key={framework}>
            <p className="eyebrow">
              {framework === "claims"
                ? "01 · Credibility & integrity"
                : "02 · Understanding, managing & communicating"}
            </p>
            <h2>{frameworkNames[framework]} Review</h2>
            <p>
              {framework === "claims"
                ? "How responsibly the report makes and supports its material impact claims."
                : "What the report demonstrates about impact management. This is not the full organisational maturity assessment."}
            </p>
            {result.scores[framework]!.principles.map((p) => (
              <div className="principle" key={p.name}>
                <h3>
                  {p.name}{" "}
                  <span className="badge">
                    {p.score === null ? "Unassessable" : `${p.score}/20`} ·{" "}
                    {p.coverage}/4 tests
                  </span>
                </h3>
                {p.tests.map((f) => (
                  <Finding
                    key={f.id}
                    f={f}
                    framework={framework}
                    id={id}
                    admin={admin}
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
      {!admin && (
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
