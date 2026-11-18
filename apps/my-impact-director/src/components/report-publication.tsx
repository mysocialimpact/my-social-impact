"use client";
import type { ReviewResult } from "@/lib/pipeline";
import { frameworkNames, type Framework } from "@/lib/rubric";
import { publication, identity, brief } from "@/lib/publication";
export function ReportPublication({
  result,
  framework,
  id,
  hasDetails = false,
  canShare = false,
}: {
  result: ReviewResult;
  framework: Framework;
  id: string;
  hasDetails?: boolean;
  canShare?: boolean;
}) {
  const view = publication(result, framework),
    brand = identity[framework];
  return (
    <article
      className="publication"
      style={{ "--edition": brand.colour } as React.CSSProperties}
    >
      <div
        className={
          "pub-mast " + (framework === "report" ? "pub-mast-edit" : "")
        }
      >
        <img src={"/brand/" + brand.logo} alt="" />
        <span>{frameworkNames[framework]}</span>
        <small>Methodology {result.version}</small>
      </div>
      <header className="pub-cover">
        <div className="pub-cover-grid">
          <div>
            <p>{result.context.organisation}</p>
            <h1>{result.context.title}</h1>
          </div>
          <div className="pub-grade">
            {view.overall ? (
              <>
                <strong>
                  {view.overall.percent}
                  <small>/100</small>
                </strong>
                <b>{view.overall.label}</b>
              </>
            ) : (
              <strong className="pub-withheld">{view.withheld}</strong>
            )}
          </div>
        </div>
        <div className="pub-verdict">
          <span>Your {framework === "report" ? "editorial " : ""}verdict</span>
          <p>{view.verdict}</p>
        </div>
      </header>
      <p className="pub-note">
        {brand.note}{" "}
        {framework === "report" &&
          !view.overall &&
          result.publicationNotice &&
          "An overall score is unavailable because inspection, criterion coverage or editorial consistency checks are incomplete."}{" "}
        {framework !== "report" &&
          "Automated assessment. Independent assurance requires professional review."}
      </p>
      <nav className="publication-nav" aria-label="Report contents">
        <a href="#pillar-scores">Scores</a>
        <a href="#priorities">Priorities</a>
        <a href="#main-findings">Findings</a>
        {hasDetails && <a href="#supporting-evidence">Evidence</a>}
        {canShare && <a href="#share-report">Share</a>}
        <a href="#professional-support">Expert help</a>
      </nav>
      <section className="pub-scores" id="pillar-scores">
        <h2>
          {framework === "claims" ? "The five principles" : "The five pillars"}
        </h2>
        <div>
          {view.pillars.map((p) => (
            <section
              key={p.name}
              style={
                {
                  "--score-colour": p.rating?.colour ?? "#667085",
                } as React.CSSProperties
              }
            >
              <h3>{p.name}</h3>
              {framework === "report" && !view.overall && (
                <small>Provisional estimate</small>
              )}
              <strong>{p.rating ? p.rating.percent + "%" : "—"}</strong>
              <b>{p.rating?.label || "Unassessable"}</b>
              <div className="pub-meter">
                <i style={{ width: (p.rating?.percent || 0) + "%" }} />
              </div>
              <small>
                {p.points === null
                  ? "No score"
                  : p.points + " / " + p.maximum + " points"}
              </small>
              <p className="pillar-explanation">{p.insight}</p>
              {p.insightPages.length > 0 && (
                <small>
                  Source pages{" "}
                  {p.insightPages.slice(0, 3).join(", ") +
                    (p.insightPages.length > 3 ? " · more in findings" : "")}
                </small>
              )}
              {hasDetails && (
                <a
                  href="#supporting-evidence"
                  onClick={() => {
                    const el = document.getElementById("supporting-evidence");
                    if (el instanceof HTMLDetailsElement) el.open = true;
                  }}
                >
                  Explore the findings →
                </a>
              )}
            </section>
          ))}
        </div>
      </section>
      <section className="pub-priorities" id="priorities">
        <h2>Three things to do next.</h2>
        <ol>
          {view.priorities.map((a, i) => (
            <li key={i}>
              <span>0{i + 1}</span>
              <div>
                <h3>{a.title}</h3>
                <p>{a.summary}</p>
                {a.detail !== a.summary && (
                  <details>
                    <summary>Full recommendation</summary>
                    <p>{a.detail}</p>
                  </details>
                )}
                {a.pages.length > 0 && (
                  <small>
                    Related evidence · PDF pp. {a.pages.slice(0, 3).join(", ")}
                  </small>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>
      <div className="pub-balance" id="main-findings">
        {[
          ["What works.", result.actions.strengths],
          ["What needs attention.", result.actions.opportunities],
        ].map(([title, items]) => (
          <section key={String(title)}>
            <h2>{title}</h2>
            <ul>
              {(items as string[]).slice(0, 3).map((s, i) => (
                <li key={i}>{brief(s)}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {view.pillars.some((p) => p.excerpt) && (
        <details className="pub-excerpt">
          <summary>Selected passages from your report</summary>
          {view.pillars
            .filter((p) => p.excerpt)
            .slice(0, 2)
            .map((p) => (
              <blockquote key={p.name}>
                {p.excerpt!.quote}
                <footer>
                  {id ? (
                    <a href={`/reviews/${id}/source?page=${p.excerpt!.page}`}>
                      {p.name} · Original PDF page {p.excerpt!.page}
                    </a>
                  ) : (
                    <span>
                      {p.name} · Source page {p.excerpt!.page}
                    </span>
                  )}
                </footer>
              </blockquote>
            ))}
        </details>
      )}
    </article>
  );
}
