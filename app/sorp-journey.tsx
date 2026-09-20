import { readinessStages } from "./sorp-questionnaire";
import "./sorp-journey.css";

export type SorpBasis = { classification: string; explanation: string; interpretation?: string; citations: { reference: string; module: string; page: number; extract: string }[] };
export type ReadinessWorkflow = {
  version: number; currentStage: number; completedStages: number[]; stageTitle: string; stageCount: number;
  known: { id: string; label: string; value: string; established: boolean; source: string }[];
  next: { id: string; question: string; why: string; basis: SorpBasis; actions: { label: string; value: string }[] };
};

export function SorpJourneyProgress({ current, completed, result = false }: { current: number; completed: number[]; result?: boolean }) {
  return <header className="sorp-journey-progress">
    <div className="sorp-journey-title"><div><span>{result ? "Your free personalised report" : `Stage ${current} of 7`}</span><strong>{result ? "Your SORP readiness result" : readinessStages[current - 1]}</strong></div><span className="sorp-journey-count">{completed.length ? `✓ ${completed.length} ${completed.length === 1 ? "stage" : "stages"} complete` : "Let’s establish what applies"}</span></div>
    <ol aria-label="Your seven-stage SORP readiness journey">{readinessStages.map((title, index) => <li key={title} className={completed.includes(index + 1) ? "is-complete" : current === index + 1 ? "is-current" : ""} aria-current={current === index + 1 && !result ? "step" : undefined}><span aria-hidden="true">{completed.includes(index + 1) ? "✓" : index + 1}</span><small>{title}</small></li>)}</ol>
  </header>;
}

export function SorpBasisDrawer({ basis }: { basis: SorpBasis }) {
  return <details className="sorp-basis-drawer"><summary>See the SORP basis <span aria-hidden="true">+</span></summary><div><span className="sorp-basis-label">{basis.classification === "MSI_READINESS" || basis.classification === "JUDGEMENT" ? "MSI JUDGEMENT" : basis.classification}</span><h4>Charities SORP 2026</h4><p>{basis.explanation}</p>{basis.interpretation && <p className="sorp-basis-note">{basis.interpretation}</p>}{basis.citations.length ? basis.citations.map(citation => <article key={citation.reference}><strong>Paragraph {citation.reference}</strong><small>{citation.module} · PDF page {citation.page}</small><p>{citation.extract}</p></article>) : <p className="sorp-basis-note">MSI judgement: this step helps us tailor the assessment. It is not taken from one specific SORP paragraph.</p>}</div></details>;
}

export function SorpKnownContext({ workflow }: { workflow: ReadinessWorkflow }) {
  const count = workflow.known.filter(item => item.established).length;
  if (!count) return null;
  return <details className="sorp-known-context" open><summary><span>What we know so far</span><small>{count} of {workflow.known.length} established</small></summary><dl>{workflow.known.map(item => <div key={item.id} className={item.established ? "is-known" : "is-unresolved"}><span aria-hidden="true">{item.established ? "✓" : "○"}</span><div><dt>{item.label}</dt><dd>{item.value}</dd>{item.established && <small>{item.source === "publicly_observed" ? "Public record · correct us if this has changed" : "Confirmed with you"}</small>}</div></div>)}</dl></details>;
}
