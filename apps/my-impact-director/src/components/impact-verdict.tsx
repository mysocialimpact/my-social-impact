import type { ReviewResult } from "@/lib/pipeline";
import { pillarMaximum } from "@/lib/report-methodology";
export function ImpactVerdict({ result }: { result: ReviewResult }) {
  const score = result.scores.report!;
  return (
    <section className="impact-verdict" aria-label="Your Impact Edit verdict">
      <div className="impact-verdict-head">
        <div className="impact-verdict-number">
          <strong>{score.overall ?? "—"}</strong>
          <span>
            {score.overall === null
              ? "Overall score withheld"
              : "Indicative score / 100"}
          </span>
        </div>
        <div>
          <p className="eyebrow">
            The verdict · Methodology {result.version} · Beta
          </p>
          <h2>{result.rating?.label || "Your editorial review"}</h2>
          <p>{result.editorial?.verdict || result.actions.summary}</p>
        </div>
      </div>
      <p className="impact-verdict-limits">
        AI-assisted creative judgement is partly subjective. This beta has not
        been independently validated by human editors. {score.coverage}/25
        criteria assessed. Technical accessibility compliance is not
        established.
      </p>
      {score.provisional && (
        <p className="alert error">
          {result.editorial?.scoreConsistency === "review_needed"
            ? "Editorial quality control found an unresolved inconsistency. We’ve withheld the overall score; inspect the evidence before relying on these findings."
            : "Coverage or visual evidence is insufficient for a dependable overall score. This is an assessment limitation, not a judgement of poor design."}
        </p>
      )}
      {!!result.readerInspection?.accessibilityConcerns.length && (
        <aside className="impact-material-limits">
          <strong>Material accessibility concerns</strong>
          <ul>
            {result.readerInspection.accessibilityConcerns.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </aside>
      )}
      <div className="impact-pillar-grid">
        {score.principles.map((p) => (
          <div key={p.name}>
            <span>{p.name}</span>
            <strong>
              {p.score === null ? "—" : p.score}
              <small> / {pillarMaximum(p)}</small>
            </strong>
            <div className="bar-track" aria-hidden="true">
              <div
                className="bar-fill"
                style={{
                  width: `${((p.score || 0) / pillarMaximum(p)) * 100}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="impact-priorities">
        <h3>Three priorities for your next report</h3>
        <ol>
          {result.actions.actions.slice(0, 3).map((a) => (
            <li key={a.title}>
              <details>
                <summary>{a.title}</summary>
                <p>{a.detail}</p>
              </details>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
