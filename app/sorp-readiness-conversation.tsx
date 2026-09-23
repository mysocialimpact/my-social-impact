"use client";

import { FormEvent, type DragEvent, useEffect, useRef, useState } from "react";
import { SorpSnapshotLink } from "./sorp-snapshot-link";
import { SorpResultActions } from "./sorp-result-actions";
import { buildActivitySubmission, toggleActivityChoice } from "./sorp-activity-selection";
import { SorpJourneyProgress, SorpKnownContext, SorpBasisDrawer, type PublicReadinessFinding, type PublicReadinessReview, type ReadinessWorkflow } from "./sorp-journey";
import { additionalChecks, coreQuestions, readinessStages, type AdditionalAnswerValue, type AnswerValue, type AssessmentSetup } from "./sorp-questionnaire";

const SNAPSHOT_RESULT_KEY = "msi-sorp-readiness-result-v2";
const CONVERSATION_KEY = "msi-sorp-readiness-conversation-v1";

type Citation = { reference: string; module: string; page: number; extract: string };
type PublicSource = { label: string; url: string; detail: string; kind: "official_register" | "organisation_website" | "annual_report" | "other_public" };
type OrganisationCard = { name: string; locality: string };
type MessageAction = { label: string; value: string };
type FieldState = { answer: AnswerValue | null; evidence: string; confidence: number };
type AdditionalState = { answer: AdditionalAnswerValue | null; evidence: string; relevant: boolean };
type ContextEvidence = { basis: "publicly_observed" | "user_confirmed"; detail: string; sources: string[] };
type PendingStructuredAnswer = { target: `field:${number}` | `check:${string}`; answer: AnswerValue; label: string; selectedAt: string };
type IntelligenceProvenance = {
  registry: string;
  assistantId: string;
  effectiveVersion: string;
  resolvedAt: string;
  mode: "CURRENT" | "PINNED" | "LAST_KNOWN_PUBLISHED";
  usedFallback: boolean;
  layers: { id: string; name: string; kind: string; relationship: "INHERITED" | "EXTENDED" | "OVERRIDDEN"; version: number; label: string; status: "ACTIVE" | "ARCHIVED"; publishedAt: string | null }[];
  runtimeControls: { name: string; type: string; representedBy: string }[];
};

export type ReadinessState = {
  charityName: string;
  assessmentMode: "sorp_readiness" | "impact_readiness";
  sorpApplicability: "unknown" | "likely_applies" | "not_applicable" | "uncertain";
  setup: AssessmentSetup;
  organisationResearch: unknown;
  contextEvidence: Record<string, ContextEvidence>;
  uncertainty: string[];
  fields: Record<string, FieldState>;
  additional: Record<string, AdditionalState>;
  completedStages: number[];
  currentStage: number;
  score: number | null;
  inheritedSnapshot: boolean;
  publicSearchCheckpointAcknowledged: boolean;
  publicReviewAcknowledged: boolean;
  impactReportInput: "none" | "awaiting_link" | "skipped" | "uploaded";
  impactReportConfirmation: "unconfirmed" | "confirmed" | "replacement_requested";
  pendingStructuredAnswer: PendingStructuredAnswer | null;
};

type Result = {
  score: number;
  band: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  overview: string;
  sectionScores: { section: string; label: string; score: number; narrative: string }[];
  strong: string[];
  attention: string[];
  must: string[];
  should: string[];
  may: string[];
  judgement: string[];
  additionalChecks: string[];
  trusteesReportReadiness: string[];
  widerImpactEvidence: string[];
  userConfirmedPractice: string[];
  priorities: string[];
};

type Message = {
  workflow?: ReadinessWorkflow;
  responseKind?: "assessment" | "detour" | "result";
  role: "user" | "assistant";
  content: string;
  label?: "MUST" | "SHOULD" | "MAY" | "JUDGEMENT" | "MSI READINESS" | null;
  citations?: Citation[];
  publicSources?: PublicSource[];
  organisation?: OrganisationCard | null;
  actions?: MessageAction[];
};

type ConversationCheckpoint = {
  state: ReadinessState;
  messagesLength: number;
  workflow: ReadinessWorkflow | null;
  result: Result | null;
  intelligence: IntelligenceProvenance | null;
  completionNotice: string;
  activitySelections: string[];
  composer: string;
  answerText?: string;
  note?: string;
};

type ReadinessResponse = {
  workflow: ReadinessWorkflow;
  state: ReadinessState;
  assistant: { message: string; label: Message["label"]; citations: Citation[]; publicSources?: PublicSource[]; organisation?: OrganisationCard | null; actions?: MessageAction[]; responseKind: "assessment" | "detour" | "result" };
  result: Result | null;
  intelligence: IntelligenceProvenance | null;
  sessionId: string;
};

type SavedProgress = { started: boolean; state: ReadinessState; messages: Message[]; result: Result | null; intelligence: IntelligenceProvenance | null; sessionId: string; workflow: ReadinessWorkflow | null; checkpoints: ConversationCheckpoint[] };
type ReadinessAccount = { id: string; email: string; name: string; position: string; organisation: string; currentStage: number; completedStages: number[]; createdAt: string; lastSavedAt: string };

const emptySetup: AssessmentSetup = { role: "", jurisdiction: "", startDate: "", endDate: "", accounts: "", accountsReview: "", income: "", nearBoundary: false, activities: [] };

function blankState(): ReadinessState {
  return {
    charityName: "",
    assessmentMode: "sorp_readiness",
    sorpApplicability: "unknown",
    setup: emptySetup,
    organisationResearch: { status: "unsearched", query: "", candidates: [], selected: null, checkedAt: "", enrichedAt: "" },
    contextEvidence: {},
    uncertainty: [],
    fields: Object.fromEntries(coreQuestions.map((question) => [String(question.id), { answer: null, evidence: "", confidence: 0 }])),
    additional: Object.fromEntries(additionalChecks.map((check) => [check.id, { answer: null, evidence: "", relevant: false }])),
    completedStages: [],
    currentStage: 1,
    score: null,
    inheritedSnapshot: false,
    publicSearchCheckpointAcknowledged: false,
    publicReviewAcknowledged: false,
    impactReportInput: "none",
    impactReportConfirmation: "unconfirmed",
    pendingStructuredAnswer: null,
  };
}

const structuredAnswerValues: Record<string, AnswerValue> = {
  "YES, CLEARLY": "yes",
  "MOSTLY": "mostly",
  "PARTLY": "partly",
  "NOT YET": "not_yet",
  "NOT SURE": "not_sure",
};

function structuredAnswerFromAction(value: string, target: string): PendingStructuredAnswer | null {
  if (!/^(?:field:\d+|check:[a-z_]+)$/.test(target)) return null;
  const label = value.trim().toUpperCase().replace(/^KEEP\s+/, "").replace(/[.!]+$/g, "");
  const answer = structuredAnswerValues[label];
  return answer ? { target: target as PendingStructuredAnswer["target"], answer, label, selectedAt: new Date().toISOString() } : null;
}

function looksLikeQuestion(value: string) {
  return /\?$/.test(value.trim()) || /^(?:why|what|how|when|where|who|can|could|would|should|does|do|is|are)\b/i.test(value.trim());
}

function isDeterministicSetupReply(value: string, stepId = "") {
  const answer = value.trim();
  if (["accountsConfirmation", "startDateConfirmation"].includes(stepId)) {
    return /^(?:yes|yep|yeah|correct|right|no|nope|i\s+(?:don[’']?t|do not)\s+know|not sure|skip|move on)\b/i.test(answer);
  }
  if (stepId === "accounts") {
    return /(?:\baccrual|\breceipts?\s*(?:and|&)\s*payments?|^skip\b|^move on\b)/i.test(answer);
  }
  if (stepId === "publicReview") {
    return /^(?:yes\b.*latest impact report|no\b.*newer impact report|add a public report link|skip adding|continue to|go deeper)/i.test(answer);
  }
  if (stepId === "impactReportLink") return /^(?:skip adding|continue without)/i.test(answer);
  if (stepId === "publicSearchCheckpoint") return /^(?:continue to quick review|see my quick review)\b/i.test(answer);
  return false;
}

function organisationResearchStatus(value: unknown) {
  if (!value || typeof value !== "object" || !("status" in value)) return "";
  return typeof value.status === "string" ? value.status : "";
}

function workingStatusFor(value: string, state: ReadinessState, workflow: ReadinessWorkflow | null) {
  const answer = value.trim();
  if (looksLikeQuestion(answer)) return "Thinking about your question and checking the relevant SORP guidance…";
  const researchStatus = organisationResearchStatus(state.organisationResearch);
  if (researchStatus === "needs_confirmation") {
    if (/^(?:no|nope|not us|try again|different|wrong)\b/i.test(answer)) return "Looking again for the right organisation…";
    return "Checking the Charity Commission record, latest accounts and Trustees’ Annual Report…";
  }
  const step = workflow?.next.id || "";
  if (step === "organisation" || (!state.charityName && state.currentStage === 1)) return "Looking for the right organisation…";
  if (["accounts", "accountsConfirmation", "startDate", "startDateConfirmation", "income", "activities", "publicReview", "impactReportLink"].includes(step)) return "Checking the organisation’s public information and what applies…";
  if (/^(?:field:|check:)/.test(step)) return "Understanding your answer and checking the relevant SORP guidance…";
  if (step === "result") return "Bringing your readiness report together…";
  return "Understanding what you’ve said and checking what matters next…";
}

function newSessionId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `sorp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function stateFromSnapshot(raw: string): { state: ReadinessState; result: Result | null } | null {
  try {
    const snapshot = JSON.parse(raw) as {
      setup?: AssessmentSetup;
      setupState?: ReadinessState;
      coreQuestions?: { id: number; answer?: AnswerValue; context?: string }[];
      additionalChecks?: { id: string; answer?: AdditionalAnswerValue }[];
      result?: { score?: number; band?: string; sectionScores?: { section: string; label: string; score: number }[]; flags?: { must?: string[]; should?: string[]; may?: string[]; judgement?: string[] } };
    };
    if (!snapshot.setup || !snapshot.coreQuestions?.length || typeof snapshot.result?.score !== "number") return null;
    const state = { ...blankState(), ...snapshot.setupState };
    state.setup = { ...emptySetup, ...snapshot.setup };
    state.inheritedSnapshot = true;
    state.completedStages = [1, 2, 3, 4, 5, 6, 7];
    state.currentStage = 8;
    state.score = snapshot.result.score;
    for (const field of snapshot.coreQuestions) {
      state.fields[String(field.id)] = { answer: field.answer ?? null, evidence: field.context ?? "Snapshot answer", confidence: field.context ? .95 : .8 };
    }
    for (const check of snapshot.additionalChecks ?? []) {
      state.additional[check.id] = { answer: check.answer ?? null, evidence: "Snapshot answer", relevant: true };
    }
    const sectionScores = snapshot.result.sectionScores ?? [];
    const result: Result = {
      score: snapshot.result.score,
      band: snapshot.result.band ?? "Initial readiness picture",
      confidence: "MEDIUM",
      overview: "This is your Quick Snapshot result. The conversation can add context and nuance without asking all 15 questions again.",
      sectionScores: sectionScores.map((section) => ({ ...section, narrative: "The conversation can add a more specific explanation of this area." })),
      strong: sectionScores.filter((section) => section.score >= 70).map((section) => section.label),
      attention: sectionScores.filter((section) => section.score < 60).map((section) => section.label),
      must: snapshot.result.flags?.must ?? [],
      should: snapshot.result.flags?.should ?? [],
      may: snapshot.result.flags?.may ?? [],
      judgement: snapshot.result.flags?.judgement ?? [],
      additionalChecks: (snapshot.additionalChecks ?? []).map((check) => additionalChecks.find((item) => item.id === check.id)?.title ?? check.id),
      trusteesReportReadiness: [],
      widerImpactEvidence: [],
      userConfirmedPractice: snapshot.coreQuestions.filter((question) => Boolean(question.answer)).slice(0, 6).map((question) => `Question ${question.id}: ${question.answer?.replaceAll("_", " ")}`),
      priorities: [],
    };
    return { state, result };
  } catch {
    return null;
  }
}

function InlineText({ text }: { text: string }) {
  return <>{text.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((part, index) => part.startsWith("**") && part.endsWith("**")
    ? <strong key={`${index}-${part.slice(0, 18)}`}>{part.slice(2, -2)}</strong>
    : part)}</>;
}

function MessageContent({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  return <>{blocks.map((block, index) => {
    const heading = block.match(/^\*\*(.+)\*\*$/);
    if (heading) return <h3 className="readiness-message-heading" key={`${index}-${heading[1]}`}>{heading[1]}</h3>;
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    if (lines.length && lines.every((line) => line.startsWith("- "))) {
      return <ul className="readiness-message-list" key={`${index}-${block.slice(0, 18)}`}>{lines.map((line) => <li key={line}><InlineText text={line.slice(2)} /></li>)}</ul>;
    }
    return <p key={`${index}-${block.slice(0, 24)}`}>{lines.map((line, lineIndex) => <span key={`${lineIndex}-${line.slice(0, 18)}`}><InlineText text={line} />{lineIndex < lines.length - 1 && <br />}</span>)}</p>;
  })}</>;
}

function recordingTime(seconds: number) {
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

function sourceKindLabel(kind: PublicSource["kind"]) {
  return {
    official_register: "Official register",
    organisation_website: "Organisation website",
    annual_report: "Annual report",
    other_public: "Public source",
  }[kind];
}

function confirmationSourceLabel(source: PublicSource) {
  if (source.kind === "organisation_website") return "Website";
  if (/compan(?:y|ies)house|company-information/i.test(source.url)) return "Companies House";
  return "Charity register";
}

function intelligenceLayerLabel(layer: IntelligenceProvenance["layers"][number]) {
  if (layer.id === "msi-core") return "MSI Intelligence";
  if (layer.id === "sorp-readiness-intelligence") return "SORP Intelligence";
  return layer.name;
}

function ResultList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return <article><h4>{title}</h4>{items.length ? <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p>{empty}</p>}</article>;
}

const answerLabels: Record<PublicReadinessFinding["suggestedAnswer"], string> = { yes: "YES, CLEARLY", mostly: "MOSTLY", partly: "PARTLY", not_yet: "NOT YET", not_sure: "NOT SURE" };

function reportYear(title: string, url: string) {
  const match = `${title} ${url}`.match(/(?:19|20)\d{2}(?:[\s-]+(?:19|20)?\d{2})?/);
  return match?.[0] || "Latest published report";
}

const preliminaryAnswerScores: Record<PublicReadinessFinding["suggestedAnswer"], number> = { yes: 100, mostly: 75, partly: 50, not_yet: 0, not_sure: 25 };

function deriveTarScore(review: PublicReadinessReview) {
  if (typeof review.tarScore === "number") return review.tarScore;
  const supported = review.findings.filter((finding) => finding.trusteesReportEvidence.trim() && finding.suggestedAnswer !== "not_sure");
  if (supported.length) return Math.round(supported.reduce((total, finding) => total + preliminaryAnswerScores[finding.suggestedAnswer], 0) / supported.length);
  if (!review.trusteesReport.reviewed) return null;
  return review.readinessStatus === "likely_ready" ? 80 : review.readinessStatus === "partly_ready" ? 55 : review.readinessStatus === "not_yet_ready" ? 30 : 50;
}

function quickReviewBand(status?: PublicReadinessReview["readinessStatus"]) {
  return status === "likely_ready" ? "Looking strong" : status === "not_yet_ready" ? "Needs attention" : status === "partly_ready" ? "Getting ready" : "Starting point";
}

function likelyTier(income: AssessmentSetup["income"]) {
  if (income === "tier3") return "Likely Tier 3";
  if (income === "tier2") return "Likely Tier 2";
  if (income === "tier1_low" || income === "tier1_high") return "Likely Tier 1";
  return "Income tier not yet established";
}

function ImpactReportFound({ review, confirmed }: { review: PublicReadinessReview; confirmed: boolean }) {
  if (!review.impactReport.found) return null;
  const title = review.impactReport.title || "Impact Report / Annual Review";
  return <section className="sorp-impact-report-found" aria-label="Impact report found">
    <p className="sorp-impact-report-kicker">✓ Latest Impact Report found</p>
    <h3>{title}</h3>
    <p className="sorp-impact-report-year">{reportYear(title, review.impactReport.url)}</p>
    {review.impactReport.url && <a className="sorp-impact-report-view" href={review.impactReport.url} target="_blank" rel="noreferrer">View report ↗</a>}
    {!confirmed && <><p className="sorp-impact-report-provenance">Publicly found</p><p className="sorp-impact-report-question">Is this your latest Impact Report?</p></>}
    {confirmed && <p className="sorp-impact-report-confirmed">✓ Confirmed with you <span>Publicly found + user confirmed · wider impact evidence</span></p>}
  </section>;
}

function QuickReviewFeedback({ value, comment, onSelect, onComment }: { value: number | null; comment: string; onSelect: (value: number) => void; onComment: (value: string) => void }) {
  return <section className="sorp-quick-review-feedback" aria-label="Quick Readiness Review feedback">
    <p><strong>How’s this going?</strong><span>Your rating saves instantly and never interrupts the assessment.</span></p>
    <div className="sorp-feedback-scale"><span>1 · Not useful yet</span><span>5 · Extremely useful</span></div>
    <div className="sorp-feedback-stars" role="group" aria-label="How useful was this Quick Readiness Review?">{[1, 2, 3, 4, 5].map((rating) => <button key={rating} type="button" className={value === rating ? "is-selected" : undefined} aria-label={`${rating} out of 5`} aria-pressed={value === rating} onClick={() => onSelect(rating)}>{value !== null && rating <= value ? "★" : "☆"}</button>)}</div>
    <details className="sorp-feedback-comment"><summary>Add an optional comment</summary><label><strong>Anything you’d like to tell us?</strong><span>Optional</span><textarea value={comment} maxLength={800} rows={2} onChange={(event) => onComment(event.target.value)} placeholder="Add a short comment if useful…" /></label></details>
  </section>;
}

function ProvisionalReadinessView({ review, income, publicIncome, impactReportConfirmed = false }: { review: PublicReadinessReview; income: AssessmentSetup["income"]; publicIncome: string; impactReportConfirmed?: boolean }) {
  if (!review.trusteesReport.reviewed) return <ImpactReportFound review={review} confirmed={impactReportConfirmed} />;
  const tarScore = deriveTarScore(review);
  const widerScore = typeof review.widerEvidenceScore === "number" && review.widerEvidenceScore !== tarScore ? review.widerEvidenceScore : null;
  const findings = [
    ...review.strong.slice(0, 2).map((text) => ({ kind: "strong", text })),
    ...review.attention.slice(0, 1).map((text) => ({ kind: "attention", text })),
    ...review.unknown.slice(0, 1).map((text) => ({ kind: "unknown", text })),
  ].slice(0, 4);
  const incomeAmount = publicIncome.replace(/\s*·.*$/, "");
  return <section className="sorp-provisional-view" aria-label="Provisional SORP readiness starting point">
    <header><div><span>Quick Readiness Review</span><h3>So — how SORP ready do you look?</h3></div><strong className={`is-${review.overallConfidence}`}><small>Confidence</small>{review.overallConfidence}</strong></header>
    <div className="sorp-quick-score"><strong>{tarScore === null ? "—" : tarScore}<small>/100</small></strong><div><b>{quickReviewBand(review.readinessStatus)}</b><span>Based primarily on your latest Trustees’ Annual Report.</span></div></div>
    <p className="sorp-quick-tier">{likelyTier(income)}{incomeAmount ? ` · based on latest public income of ${incomeAmount}` : " · based on the public information available"}</p>
    <ul className="sorp-quick-findings">{findings.map((finding, index) => <li className={`is-${finding.kind}`} key={`${finding.kind}-${index}`}><span aria-hidden="true">{finding.kind === "strong" ? "✓" : "△"}</span><p>{finding.text}</p></li>)}</ul>
    <p className="sorp-provisional-note">This is a historical starting point, not proof of future SORP 2026 readiness. The next questions confirm what still applies.</p>
    {review.impactReport.found && <details className="sorp-wider-evidence"><summary>We also found wider impact evidence <span>See wider evidence +</span></summary><div><ImpactReportFound review={review} confirmed={impactReportConfirmed} />{widerScore !== null && <p><strong>Wider evidence view: {widerScore}/100</strong><span>{review.widerEvidenceReason || "This adds useful context beyond the Trustees’ Annual Report."}</span></p>}{review.impactReport.url && <nav aria-label="Wider impact evidence reviewed"><a href={review.impactReport.url} target="_blank" rel="noreferrer">{review.impactReport.title || "Impact Report"} ↗</a></nav>}</div></details>}
    {!review.impactReport.found && review.trusteesReport.url && <a className="sorp-trustees-report-link" href={review.trusteesReport.url} target="_blank" rel="noreferrer">View the Trustees’ Annual Report used ↗</a>}
  </section>;
}

function PublicSearchCheckpoint({ workflow }: { workflow: ReadinessWorkflow }) {
  const items = workflow.known.filter((item) => ["charityName", "legalStatus", "jurisdiction", "income", "accounts", "startDate", "trusteesReport", "impactReport"].includes(item.id));
  const charity = items.find((item) => item.id === "charityName")?.value || "your charity";
  return <section className="sorp-public-search-checkpoint" aria-label="Public information checkpoint">
    <p className="sorp-impact-report-kicker">Great — we found what we needed.</p>
    <h3>✓ SORP 2026 appears to apply to {charity}</h3>
    <p className="sorp-public-search-note">We found the key public information we need, including your latest accounts, reporting context and Trustees’ Annual Report. You can see the detail on the left.</p>
    <p className="sorp-quick-review-ready">Your Quick Readiness Review is ready.</p>
  </section>;
}

function ImpactReportUploader({ onChoose, dragging, onDragEnter, onDragLeave, onDragOver, onDrop, busy }: {
  onChoose: () => void;
  dragging: boolean;
  onDragEnter: (event: DragEvent<HTMLButtonElement>) => void;
  onDragLeave: (event: DragEvent<HTMLButtonElement>) => void;
  onDragOver: (event: DragEvent<HTMLButtonElement>) => void;
  onDrop: (event: DragEvent<HTMLButtonElement>) => void;
  busy: boolean;
}) {
  return <section className={`sorp-impact-report-uploader${dragging ? " is-dragging" : ""}`} aria-label="Add your latest Impact Report">
    <p className="sorp-impact-report-kicker">Add your latest Impact Report</p>
    <button type="button" className="sorp-impact-report-dropzone" onClick={onChoose} onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDragOver={onDragOver} onDrop={onDrop} disabled={busy}>
      <strong>{busy ? "Reading your report…" : "Drag your report here"}</strong>
      <span>{busy ? "Please keep this window open while we review it." : "or"}</span>
      <b>{busy ? "Upload in progress" : "Choose file"}</b>
    </button>
    <small>PDF preferred · Word documents supported · maximum 4 MB</small>
  </section>;
}

function PublicAnswerProposal({ proposal }: { proposal: PublicReadinessFinding }) {
  return <section className="sorp-answer-proposal" aria-label="Public-evidence suggested answer">
    <span>{proposal.trusteesReportEvidence ? "Based on your latest Trustees’ Annual Report, we think:" : "Based on the wider public evidence, we think:"}</span>
    <strong>{answerLabels[proposal.suggestedAnswer]}</strong>
    <h4>Why</h4><p>{proposal.reason}</p>
    <div className="sorp-public-evidence-split"><p><b>Trustees’ Annual Report</b><span>{proposal.trusteesReportEvidence || "We could not establish this from the Trustees’ Annual Report."}</span></p><p><b>Wider impact evidence</b><span>{proposal.widerImpactEvidence || "No separate wider evidence changes this view."}</span></p></div>
    <p className="sorp-proposal-confirm">Does that seem right?<span>Keep it, change it below, or tell us in your own words.</span></p>
  </section>;
}

function SorpStageContext({ workflow, income, impactReportConfirmed, accountEmail, organisation, publicSources = [] }: { workflow: ReadinessWorkflow; income: AssessmentSetup["income"]; impactReportConfirmed: boolean; accountEmail?: string; organisation?: OrganisationCard | null; publicSources?: PublicSource[] }) {
  const publicIncome = workflow.known.find((item) => item.id === "income")?.value || "";
  const showKnownContext = workflow.currentStage === 1 || workflow.next.id === "publicSearchCheckpoint";
  return <>
    {organisation ? <section className="sorp-stage-context is-organisation" aria-label="Organisation found"><span>Organisation found</span><h2>{organisation.name}</h2>{organisation.locality && <p>{organisation.locality}</p>}{publicSources.length ? <nav aria-label="Organisation sources">{publicSources.slice(0, 2).map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{confirmationSourceLabel(source)}</a>)}</nav> : null}</section> : workflow.next.provisional ? <ProvisionalReadinessView review={workflow.next.provisional} income={income} publicIncome={publicIncome} impactReportConfirmed={impactReportConfirmed} /> : showKnownContext ? <SorpKnownContext workflow={workflow} /> : <section className="sorp-stage-context" aria-label="MSI guidance and evidence">
      <span>MSI guidance &amp; evidence</span>
      {workflow.next.proposal ? <PublicAnswerProposal proposal={workflow.next.proposal} /> : <><h2>{workflow.stageTitle}</h2><p>{workflow.next.why}</p></>}
      <SorpBasisDrawer basis={workflow.next.basis} />
    </section>}
    <p className="sorp-journey-assurance">Your free SORP readiness report<br /><span>{accountEmail ? `Account: ${accountEmail} · saved securely` : "Narrative and impact reporting · saved on this device until you create an account"}</span></p>
  </>;
}

export function SorpReadinessConversation({ setupOnly = false, onSetupComplete }: { setupOnly?: boolean; onSetupComplete?: (state: ReadinessState, workflow: ReadinessWorkflow) => void }) {
  const storageKey = setupOnly ? "msi-sorp-snapshot-setup-v1" : CONVERSATION_KEY;
  const [started, setStarted] = useState(false);
  const [state, setState] = useState<ReadinessState>(() => blankState());
  const [messages, setMessages] = useState<Message[]>([]);
  const [composer, setComposer] = useState("");
  const [busy, setBusy] = useState(false);
  const [workingStatus, setWorkingStatus] = useState("Understanding what you’ve said and checking what matters next…");
  const [quickAdvancing, setQuickAdvancing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [intelligence, setIntelligence] = useState<IntelligenceProvenance | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [workflow, setWorkflow] = useState<ReadinessWorkflow | null>(null);
  const [completionNotice, setCompletionNotice] = useState("");
  const [checkpoints, setCheckpoints] = useState<ConversationCheckpoint[]>([]);
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const [activitySelections, setActivitySelections] = useState<string[]>([]);
  const [snapshotAvailable, setSnapshotAvailable] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [recordingState, setRecordingState] = useState<"idle" | "recording" | "transcribing">("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveProfile, setSaveProfile] = useState({ name: "", position: "", email: "", password: "", confirmPassword: "" });
  const [account, setAccount] = useState<ReadinessAccount | null>(null);
  const [accountMode, setAccountMode] = useState<"signup" | "login">("signup");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [saveError, setSaveError] = useState("");
  const [reportDragging, setReportDragging] = useState(false);
  const [quickReviewFeedback, setQuickReviewFeedback] = useState<number | null>(null);
  const [quickReviewFeedbackComment, setQuickReviewFeedbackComment] = useState("");
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const reportInputRef = useRef<HTMLInputElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const viewport = window.visualViewport;
    const stamp = document.querySelector<HTMLElement>(".global-build-stamp");
    const resize = () => {
      document.documentElement.style.setProperty("--sorp-viewport-height", `${viewport?.height || window.innerHeight}px`);
      document.documentElement.style.setProperty("--sorp-stamp-height", `${stamp ? stamp.getBoundingClientRect().height : 0}px`);
      document.documentElement.classList.toggle("sorp-keyboard-open", Boolean(viewport && window.innerHeight - viewport.height > 150));
      if ((viewport?.height || window.innerHeight) < 550 && document.activeElement === composerRef.current) {
        requestAnimationFrame(() => composerRef.current?.scrollIntoView({ block: "nearest" }));
      }
    };
    resize();
    const observer = new ResizeObserver(resize);
    if (stamp) observer.observe(stamp);
    viewport?.addEventListener("resize", resize);
    return () => { observer.disconnect(); viewport?.removeEventListener("resize", resize); document.documentElement.style.removeProperty("--sorp-viewport-height"); document.documentElement.style.removeProperty("--sorp-stamp-height"); document.documentElement.classList.remove("sorp-keyboard-open"); };
  }, []);

  useEffect(() => {
    const restore = window.setTimeout(() => {
      try {
        const wantsSnapshot = !setupOnly && new URLSearchParams(window.location.search).get("from") === "snapshot";
        const snapshotRaw = window.localStorage.getItem(SNAPSHOT_RESULT_KEY);
        const snapshot = snapshotRaw ? stateFromSnapshot(snapshotRaw) : null;
        setSnapshotAvailable(Boolean(snapshot));
        if (wantsSnapshot && snapshot) {
          setSessionId(newSessionId());
          setState(snapshot.state);
          setResult(snapshot.result);
          setStarted(true);
          setMessages([{ role: "assistant", content: `I’ve got your Snapshot, so we don’t need to start again.\n\nYour initial score is ${snapshot.result?.score}/100. I’ll use those answers and focus on the areas where richer context would genuinely improve the result.\n\nTell me what feels least certain—or ask me about any part of your result.` }]);
        } else {
          const saved = window.localStorage.getItem(storageKey);
          if (saved) {
            const parsed = JSON.parse(saved) as { started?: boolean; state?: ReadinessState; messages?: Message[]; result?: Result | null; intelligence?: IntelligenceProvenance | null; sessionId?: string; workflow?: ReadinessWorkflow; checkpoints?: ConversationCheckpoint[]; quickReviewFeedback?: number | null; saveProfile?: { name: string; position: string; email: string } };
            if (parsed.started && parsed.state && parsed.messages?.length) {
              setStarted(true);
              setState({ ...blankState(), ...parsed.state, charityName: parsed.state.charityName ?? "", contextEvidence: parsed.state.contextEvidence ?? {} });
              setMessages(parsed.messages);
              setResult(parsed.result ?? null);
              setWorkflow(parsed.workflow ?? null);
              setIntelligence(parsed.workflow?.version === 2 ? parsed.intelligence ?? null : null);
              setSessionId(parsed.sessionId || newSessionId());
              setQuickReviewFeedback(typeof parsed.quickReviewFeedback === "number" ? parsed.quickReviewFeedback : null);
              if (parsed.saveProfile) setSaveProfile((current) => ({ ...current, ...parsed.saveProfile }));
              setCheckpoints(Array.isArray(parsed.checkpoints) ? parsed.checkpoints.map((checkpoint) => ({
                ...checkpoint,
                answerText: checkpoint.answerText || parsed.messages?.[checkpoint.messagesLength]?.content || "Saved answer",
              })) : []);
            }
          }
        }
      } catch {
        setError("We could not restore the local conversation, so you can start cleanly.");
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(restore);
  }, [setupOnly, storageKey]);

  useEffect(() => {
    if (!hydrated || setupOnly) return;
    const abort = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/readiness-account", { cache: "no-store", signal: abort.signal });
        if (!response.ok) return;
        const data = await response.json() as { signedIn?: boolean; account?: ReadinessAccount; progress?: Partial<SavedProgress> };
        if (!data.signedIn || !data.account) return;
        setAccount(data.account);
        setSaveProfile((current) => ({ ...current, name: data.account!.name, position: data.account!.position, email: data.account!.email }));
        const saved = data.progress;
        if (saved?.started && saved.state && saved.messages?.length) {
          setStarted(true);
          setState({ ...blankState(), ...saved.state, charityName: saved.state.charityName ?? "", contextEvidence: saved.state.contextEvidence ?? {} });
          setMessages(saved.messages);
          setResult(saved.result ?? null);
          setWorkflow(saved.workflow ?? null);
          setIntelligence(saved.intelligence ?? null);
          setSessionId(saved.sessionId || newSessionId());
          setCheckpoints(Array.isArray(saved.checkpoints) ? saved.checkpoints : []);
        }
      } catch (caught) {
        if (!abort.signal.aborted) console.error("Saved SORP account could not be restored", caught);
      }
    })();
    return () => abort.abort();
  }, [hydrated, setupOnly]);

  useEffect(() => {
    if (!hydrated || !started) return;
    try { window.localStorage.setItem(storageKey, JSON.stringify({ started, state, messages, result, intelligence, sessionId, workflow, checkpoints, quickReviewFeedback, saveProfile: { name: saveProfile.name, position: saveProfile.position, email: saveProfile.email } })); } catch { queueMicrotask(() => setError("Your browser could not save this conversation. Keep this page open to retain your progress.")); }
  }, [hydrated, started, state, messages, result, intelligence, sessionId, workflow, checkpoints, quickReviewFeedback, saveProfile, storageKey]);

  useEffect(() => {
    if (!hydrated || !started || !account || setupOnly) return;
    const timer = window.setTimeout(() => {
      void fetch("/api/readiness-account", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "save", progress: { started, state, messages, result, intelligence, sessionId, workflow, checkpoints } }) });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [hydrated, started, account, setupOnly, state, messages, result, intelligence, sessionId, workflow, checkpoints]);

  useEffect(() => {
    const restoreReviewPosition = (event: PopStateEvent) => {
      const candidate = event.state?.sorpReviewIndex;
      setReviewIndex(Number.isInteger(candidate) && candidate >= 0 && candidate < checkpoints.length ? candidate : null);
      setState((current) => ({ ...current, pendingStructuredAnswer: null }));
      setComposer("");
      setError("");
    };
    window.addEventListener("popstate", restoreReviewPosition);
    return () => window.removeEventListener("popstate", restoreReviewPosition);
  }, [checkpoints.length]);

  useEffect(() => {
    const body = document.querySelector<HTMLElement>(".sorp-journey-body");
    const target = document.querySelector<HTMLElement>(completionNotice ? ".sorp-completion-notice" : "#readiness-current-question");
    if (body && target) body.scrollTo({ top: window.innerWidth > 900 || completionNotice.includes("Organisation confirmed") ? 0 : body.scrollTop + target.getBoundingClientRect().top - body.getBoundingClientRect().top - 20, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }, [messages, busy, result, completionNotice]);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  function startConversation(useSnapshot = false) {
    setWorkflow(null);
    setCompletionNotice("");
    setCheckpoints([]);
    setReviewIndex(null);
    setActivitySelections([]);
    setQuickReviewFeedback(null);
    setQuickReviewFeedbackComment("");
    setSessionId(newSessionId());
    if (useSnapshot) {
      const raw = window.localStorage.getItem(SNAPSHOT_RESULT_KEY);
      const snapshot = raw ? stateFromSnapshot(raw) : null;
      if (snapshot) {
        setState(snapshot.state);
        setResult(snapshot.result);
        setIntelligence(null);
        setMessages([{ role: "assistant", content: `I’ve got your Snapshot, so we don’t need to start again.\n\nYour initial score is ${snapshot.result?.score}/100. I’ll focus on the weaker areas, uncertainty and any context that could change the interpretation.\n\nWhich part would you most like to talk through?` }]);
        setStarted(true);
        return;
      }
    }
    setState(blankState());
    setResult(null);
    setIntelligence(null);
    setMessages([{ role: "assistant", content: "Let’s find your charity.\n\nWhat is the charity called? A location or a few words about its work can help us find the right one." }]);
    setStarted(true);
  }

  async function submitSave(event: FormEvent) {
    event.preventDefault();
    setSaveStatus("saving");
    setSaveError("");
    try {
      const progress: SavedProgress = { started, state, messages, result, intelligence, sessionId, workflow, checkpoints };
      const action: "signup" | "login" | "save" = account ? "save" : accountMode;
      if (!account && action === "signup" && saveProfile.password !== saveProfile.confirmPassword) throw new Error("The two passwords do not match. Please re-enter them and try again.");
      const response = await fetch("/api/readiness-account", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify(action === "save" ? { action, progress } : action === "signup" ? { action, name: saveProfile.name, position: saveProfile.position, email: saveProfile.email, password: saveProfile.password, progress } : { action, email: saveProfile.email, password: saveProfile.password }),
      });
      const raw = await response.text();
      let data: { account?: ReadinessAccount; progress?: Partial<SavedProgress>; error?: string };
      try { data = raw ? JSON.parse(raw) as typeof data : {}; } catch { throw new Error("The secure saving service sent an incomplete response. Your assessment is still safe on this device and nothing has been lost. Please wait a moment and try again."); }
      if (!response.ok || !data.account) throw new Error(data.error || "The secure saving service could not complete the request. Your assessment is still safe on this device and nothing has been lost. Please wait a moment and try again.");
      setAccount(data.account);
      if (action === "login") {
        const saved = data.progress;
        if (saved?.started && saved.state && saved.messages?.length) {
          setStarted(true);
          setState({ ...blankState(), ...saved.state, charityName: saved.state.charityName ?? "", contextEvidence: saved.state.contextEvidence ?? {} });
          setMessages(saved.messages);
          setResult(saved.result ?? null);
          setWorkflow(saved.workflow ?? null);
          setIntelligence(saved.intelligence ?? null);
          setSessionId(saved.sessionId || newSessionId());
          setCheckpoints(Array.isArray(saved.checkpoints) ? saved.checkpoints : []);
        }
      }
      const storedProgress = action === "login" && data.progress?.started ? data.progress : progress;
      window.localStorage.setItem(storageKey, JSON.stringify({ ...storedProgress, saveProfile: { name: saveProfile.name, position: saveProfile.position, email: saveProfile.email } }));
      setSaveProfile((current) => ({ ...current, password: "", confirmPassword: "" }));
      setSaveStatus("saved");
      if (action === "login") {
        setCompletionNotice("✓ Signed in. Your saved assessment has been restored.");
        window.setTimeout(() => setSaveDialogOpen(false), 700);
      } else {
        window.setTimeout(() => window.location.assign("/are-you-sorp-ready?progress=saved"), 900);
      }
    } catch (caught) {
      setSaveStatus("idle");
      setSaveError(caught instanceof Error ? caught.message : "The secure saving service could not complete the request. Your assessment is still safe on this device and nothing has been lost. Please wait a moment and try again.");
    }
  }

  function selectStructuredAnswer(value: string) {
    const selectedWorkflow = reviewIndex === null ? workflow : checkpoints[reviewIndex]?.workflow;
    if (!selectedWorkflow || busy || quickAdvancing) return;
    if (reviewIndex !== null && !selectedWorkflow.next.id.match(/^(?:field:\d+|check:)/)) return;
    if (value === "__UPLOAD_REPORT__") {
      reportInputRef.current?.click();
      return;
    }
    if (selectedWorkflow.next.id === "activities") {
      setActivitySelections((current) => toggleActivityChoice(current, value));
      setError("");
      return;
    }
    const pending = structuredAnswerFromAction(value, selectedWorkflow.next.id);
    if (!pending) {
      void sendMessage(value);
      return;
    }
    setState((current) => ({ ...current, pendingStructuredAnswer: pending }));
    setComposer("");
    setError("");
    window.setTimeout(() => composerRef.current?.focus(), 40);
  }

  async function uploadReport(file: File) {
    if (busy || quickAdvancing || !workflow) return;
    const supported = file.type === "application/pdf" || file.type === "application/msword" || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || /\.(pdf|doc|docx)$/i.test(file.name);
    if (!supported) {
      setError("Sorry — that file type is not supported. Please choose a PDF or Word document.");
      return;
    }
    if (file.size > 4_000_000) {
      setError("Sorry — that report is larger than 4 MB. Please choose a smaller PDF or Word document.");
      return;
    }
    const userMessage: Message = { role: "user", content: `Added report: ${file.name}` };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setWorkingStatus("Reading the report you added and checking what it changes…");
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("file", file, file.name);
      form.set("state", JSON.stringify(state));
      form.set("sessionId", sessionId || newSessionId());
      if (intelligence?.effectiveVersion) form.set("intelligenceVersion", intelligence.effectiveVersion);
      const response = await fetch("/api/readiness/report", { method: "POST", body: form });
      const data = await response.json() as ReadinessResponse & { error?: string };
      if (!response.ok) throw new Error(data.error || "That report could not be reviewed yet.");
      setCheckpoints((current) => [...current, {
        state,
        messagesLength: messages.length,
        workflow,
        result,
        intelligence,
        completionNotice,
        activitySelections,
        composer,
        answerText: `Added report: ${file.name}`,
        note: "",
      }].slice(-30));
      setState(data.state);
      setWorkflow(data.workflow);
      if (data.intelligence) setIntelligence(data.intelligence);
      setSessionId(data.sessionId || sessionId || newSessionId());
      setMessages([...nextMessages, {
        role: "assistant",
        content: data.assistant.message,
        label: data.assistant.label,
        citations: data.assistant.citations,
        publicSources: data.assistant.publicSources,
        organisation: data.assistant.organisation,
        actions: data.assistant.actions,
        workflow: data.workflow,
        responseKind: data.assistant.responseKind,
      }]);
      setCompletionNotice(`✓ IMPACT REPORT ADDED · ${file.name}`);
    } catch (caught) {
      setMessages(messages);
      setError(caught instanceof Error ? caught.message : "That report could not be reviewed yet.");
    } finally {
      setBusy(false);
      if (reportInputRef.current) reportInputRef.current.value = "";
    }
  }

  function chooseReportFile() {
    reportInputRef.current?.click();
  }

  function recordQuickReviewFeedback(value: number) {
    setQuickReviewFeedback(value);
    void fetch("/api/growth-event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        eventId: `${sessionId}:quick-review-feedback:${crypto.randomUUID()}`,
        eventType: "quick_review_feedback",
        rating: value,
        sessionId,
      }),
    }).catch(() => undefined);
  }

  function recordQuickReviewFeedbackComment(value: string) {
    setQuickReviewFeedbackComment(value);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => {
      void fetch("/api/growth-event", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          eventId: `${sessionId}:quick-review-comment:${crypto.randomUUID()}`,
          eventType: "quick_review_feedback",
          rating: quickReviewFeedback,
          comment: value.trim(),
          sessionId,
        }),
      }).catch(() => undefined);
    }, 650);
  }

  function dropReport(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setReportDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void uploadReport(file);
  }

  async function confirmStructuredAnswer(rawNote: string) {
    const pending = state.pendingStructuredAnswer;
    if (!pending || busy || quickAdvancing || recordingState !== "idle") return;
    const note = rawNote.trim();
    const userMessage: Message = { role: "user", content: note ? `${pending.label}\n\n${note}` : pending.label };
    const reviewing = reviewIndex !== null;
    const activeCheckpoint = reviewing ? checkpoints[reviewIndex] : null;
    const activeHistory = activeCheckpoint ? messages.slice(0, activeCheckpoint.messagesLength) : messages;
    const nextMessages = [...activeHistory, userMessage];
    if (!reviewing) setMessages(nextMessages);
    setComposer("");
    setQuickAdvancing(true);
    setError("");
    try {
      const response = await fetch("/api/readiness", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: note || "Continue",
          interaction: "confirm_structured_answer",
          state,
          history: nextMessages.slice(-40).map(({ role, content }) => ({ role, content })),
          sessionId: sessionId || newSessionId(),
          intelligencePin: intelligence?.effectiveVersion ? { effectiveVersion: intelligence.effectiveVersion } : null,
        }),
      });
      const data = await response.json() as ReadinessResponse & { error?: string };
      if (!response.ok) throw new Error(data.error || "That answer could not be saved yet.");
      if (reviewing) {
        setCheckpoints((current) => current.map((checkpoint, index) => index === reviewIndex ? { ...checkpoint, answerText: pending.label, note } : checkpoint));
      } else {
        setCheckpoints((current) => [...current, {
          state: { ...state, pendingStructuredAnswer: null },
          messagesLength: messages.length,
          workflow,
          result,
          intelligence,
          completionNotice,
          activitySelections: [],
          composer: "",
          answerText: pending.label,
          note,
        }].slice(-30));
      }
      setState(data.state);
      if (!reviewing) setWorkflow(data.workflow);
      const newlyCompleted = data.workflow.completedStages.filter(stage => !workflow?.completedStages.includes(stage));
      setCompletionNotice(reviewing ? "✓ Answer updated. Later answers have been kept." : newlyCompleted.includes(7) && data.workflow.currentStage === 8 ? "✓ 7 STAGES COMPLETE · YOUR FULL READINESS REVIEW IS READY" : newlyCompleted.length ? `✓ ${newlyCompleted.map(stage => `Stage ${stage}`).join(" & ")} complete. One more part of your readiness picture established.` : "");
      if (data.intelligence) setIntelligence(data.intelligence);
      setSessionId(data.sessionId || sessionId || newSessionId());
      if (!reviewing) setMessages([...nextMessages, {
        role: "assistant",
        content: data.assistant.message,
        label: data.assistant.label,
        citations: data.assistant.citations,
        publicSources: data.assistant.publicSources,
        organisation: data.assistant.organisation,
        actions: data.assistant.actions,
        workflow: data.workflow,
        responseKind: data.assistant.responseKind,
      }]);
      if (data.result) setResult(data.result);
    } catch (caught) {
      if (!reviewing) setMessages(messages);
      setComposer(note);
      setError(caught instanceof Error ? caught.message : "That answer could not be saved yet.");
    } finally {
      setQuickAdvancing(false);
    }
  }

  async function sendMessage(rawValue: string, displayValue = rawValue, preserveActivitySelections = false, interaction?: "conversation_first") {
    const value = rawValue.trim();
    if (!value || busy || quickAdvancing || recordingState !== "idle") return;
    const deterministicSetupReply = !interaction && isDeterministicSetupReply(value, workflow?.next.id);
    const userMessage: Message = { role: "user", content: displayValue.trim() || value };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setComposer("");
    if (deterministicSetupReply) setQuickAdvancing(true);
    else {
      setWorkingStatus(interaction === "conversation_first" ? "Listening to what you mean and answering before we move on…" : workingStatusFor(value, state, workflow));
      setBusy(true);
    }
    setError("");
    try {
      const response = await fetch("/api/readiness", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: value,
          interaction,
          draftActivitySelections: interaction === "conversation_first" && workflow?.next.id === "activities" ? activitySelections : undefined,
          state,
          history: nextMessages.slice(-40).map(({ role, content }) => ({ role, content })),
          sessionId: sessionId || newSessionId(),
          intelligencePin: intelligence?.effectiveVersion ? { effectiveVersion: intelligence.effectiveVersion } : null,
        }),
      });
      const data = await response.json() as ReadinessResponse & { error?: string };
      if (!response.ok) throw new Error(data.error || "The readiness conversation is temporarily unavailable.");
      if (workflow && (data.workflow.next.id !== workflow.next.id || data.result)) setCheckpoints((current) => [...current, {
          state,
          messagesLength: messages.length,
          workflow,
          result,
          intelligence,
          completionNotice,
          activitySelections,
          composer,
          answerText: displayValue.trim() || value,
          note: "",
        }].slice(-30));
      if (workflow?.next.id === "activities" && !preserveActivitySelections) setActivitySelections([]);
      setState(data.state);
      setWorkflow(data.workflow);
      if (setupOnly && data.workflow.completedStages.includes(2)) onSetupComplete?.(data.state, data.workflow);
      const newlyKnown = data.workflow.known.filter(item => item.established && !workflow?.known.find(previous => previous.id === item.id)?.established);
      const newlyCompleted = data.workflow.completedStages.filter(stage => !workflow?.completedStages.includes(stage));
      setCompletionNotice(newlyCompleted.includes(1) ? "✓ YOUR CHARITY & SORP CONTEXT COMPLETE · SORP 2026 APPEARS TO APPLY TO YOU" : newlyCompleted.length ? `✓ ${newlyCompleted.map(stage => `Stage ${stage}`).join(" & ")} complete. ${data.workflow.currentStage === 3 ? "Your Quick Readiness Review is complete." : data.workflow.currentStage === 8 ? "Seven stages complete. Your Full Readiness Review is ready." : "One more part of your readiness picture established."}` : !workflow?.known.find(item => item.id === "charityName")?.established && data.workflow.known.find(item => item.id === "charityName")?.established ? "✓ Organisation confirmed. Here’s what we’ve found so far." : newlyKnown.length ? `✓ ${newlyKnown.map(item => item.label).join(" · ")} established. Good — that’s one more thing sorted.` : "");
      if (data.intelligence) setIntelligence(data.intelligence);
      setSessionId(data.sessionId || sessionId || newSessionId());
      setMessages((current) => [...current, {
        role: "assistant",
        content: data.assistant.message,
        label: data.assistant.label,
        citations: data.assistant.citations,
        publicSources: data.assistant.publicSources,
        organisation: data.assistant.organisation,
        actions: data.assistant.actions,
        workflow: data.workflow,
        responseKind: data.assistant.responseKind,
      }]);
      if (data.result) setResult(data.result);
    } catch (caught) {
      setMessages(messages);
      setComposer(value);
      setError(caught instanceof Error ? caught.message : "The readiness conversation is temporarily unavailable.");
    } finally {
      if (deterministicSetupReply) setQuickAdvancing(false);
      else setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (reviewIndex !== null && state.pendingStructuredAnswer) {
      void confirmStructuredAnswer(composer);
    } else if (workflow?.next.id === "activities" && composer.trim()) {
      void sendMessage(composer, composer, true, "conversation_first");
    } else if (workflow?.next.id === "activities" && activitySelections.length) {
      const actions = messages.at(-1)?.actions ?? [];
      const submission = buildActivitySubmission(activitySelections, actions, "");
      void sendMessage(submission.value, submission.display);
    } else if (state.pendingStructuredAnswer && composer.trim()) {
      void sendMessage(composer, composer, false, "conversation_first");
    } else if (state.pendingStructuredAnswer) void confirmStructuredAnswer("");
    else void sendMessage(composer);
  }

  function goBack() {
    if (busy || quickAdvancing || recordingState !== "idle") return;
    if (!checkpoints.length) return;
    const nextIndex = reviewIndex === null ? checkpoints.length - 1 : Math.max(0, reviewIndex - 1);
    setReviewIndex(nextIndex);
    window.history.pushState({ sorpReviewIndex: nextIndex }, "");
    setCompletionNotice("");
    setComposer("");
    setError("");
  }

  function goNext() {
    if (reviewIndex === null || busy || quickAdvancing || recordingState !== "idle") return;
    const nextIndex = reviewIndex < checkpoints.length - 1 ? reviewIndex + 1 : null;
    setReviewIndex(nextIndex);
    window.history.pushState({ sorpReviewIndex: nextIndex }, "");
    setCompletionNotice("");
    setComposer("");
    setState((current) => ({ ...current, pendingStructuredAnswer: null }));
    setError("");
  }

  async function startRecording() {
    setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") throw new Error("Voice recording is not available in this browser. You can still type your answer.");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const preferred = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = preferred ? new MediaRecorder(stream, { mimeType: preferred }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => void transcribe(recorder.mimeType || preferred || "audio/webm");
      recorder.start(250);
      setRecordingSeconds(0);
      setRecordingState("recording");
      timerRef.current = setInterval(() => setRecordingSeconds((seconds) => seconds + 1), 1000);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not start the microphone.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setRecordingState("transcribing");
  }

  async function transcribe(mimeType: string) {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    try {
      const audio = new Blob(chunksRef.current, { type: mimeType });
      const form = new FormData();
      form.append("audio", audio, mimeType.includes("mp4") ? "readiness.m4a" : "readiness.webm");
      const response = await fetch("/api/readiness/transcribe", { method: "POST", body: form });
      const data = await response.json() as { transcript?: string; error?: string };
      if (!response.ok || !data.transcript) throw new Error(data.error || "We could not transcribe that recording.");
      setComposer((current) => [current.trim(), data.transcript?.trim()].filter(Boolean).join(" "));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not transcribe that recording.");
    } finally {
      chunksRef.current = [];
      setRecordingState("idle");
      window.setTimeout(() => composerRef.current?.focus(), 60);
    }
  }

  const reviewCheckpoint = reviewIndex === null ? null : checkpoints[reviewIndex] || null;
  const activeWorkflow = reviewCheckpoint?.workflow || workflow;
  const activeMessages = reviewCheckpoint ? messages.slice(0, reviewCheckpoint.messagesLength) : messages;
  const currentStage = activeWorkflow?.currentStage || 1;
  const isStageOnePayoff = activeWorkflow?.next.id === "publicSearchCheckpoint";
  const progressCurrentStage = isStageOnePayoff ? 1 : currentStage;
  const progressCompletedStages = isStageOnePayoff ? (activeWorkflow?.completedStages || []).filter((stage) => stage !== 1) : activeWorkflow?.completedStages || [];
  const impactMode = state.assessmentMode === "impact_readiness";
  const pendingStructuredAnswer = state.pendingStructuredAnswer;
  const activityQuestion = activeWorkflow?.next.id === "activities" && reviewIndex === null;
  const activitySelectionCount = activitySelections.length;
  const conversationFirstMessage = Boolean((activityQuestion || pendingStructuredAnswer) && composer.trim().length > 0);
  const activeResponseMessage = activeMessages[activeMessages.length - 1]?.role === "assistant" ? activeMessages[activeMessages.length - 1] : null;
  const contextMessage = activeResponseMessage || [...activeMessages].reverse().find((message) => message.role === "assistant");
  const responseQuestionId = activeResponseMessage?.workflow?.next.id || activeWorkflow?.next.id || "";
  const messageResponseActions = activeResponseMessage?.actions || [];
  const responseActions = activeResponseMessage?.workflow?.next.provisional && responseQuestionId === "publicReview" && !messageResponseActions.some((action) => /go deeper/i.test(action.label))
    ? [{ label: "GO DEEPER", value: "Go deeper" }, ...messageResponseActions]
    : messageResponseActions;
  const showResponseActions = responseActions.length > 0 && !pendingStructuredAnswer && (reviewIndex === null || /^(?:field:\d+|check:)/.test(responseQuestionId));
  const quickReview = activeResponseMessage?.workflow?.next.provisional || null;

  if (!setupOnly && result && state.score !== null && sessionId && reviewIndex === null) return <div className="readiness-chat is-result-mode">
    <SorpJourneyProgress current={readinessStages.length} completed={Array.from({ length: readinessStages.length - 1 }, (_, index) => index + 1)} result />
    <SorpResultActions sessionId={sessionId} organisation={state.charityName} income={state.setup.income} result={result} onBackToAssessment={() => {
      if (!checkpoints.length) return;
      const nextIndex = checkpoints.length - 1;
      setReviewIndex(nextIndex);
      window.history.pushState({ sorpReviewIndex: nextIndex }, "");
    }}>
      <section className="readiness-report-detail">
        <p className="readiness-result-note">{impactMode ? "SORP does not apply in the circumstances established. This report offers wider narrative and impact-reporting guidance." : "This assesses readiness for the narrative and impact-reporting aspects of SORP 2026. It is not a declaration of full SORP compliance."}</p>
        <div className="readiness-result-sections">{result.sectionScores.map((section) => <article key={section.section}><div><h3>{section.label}</h3><strong>{section.score}</strong></div><i><b style={{ width: `${section.score}%` }} /></i><p>{section.narrative}</p></article>)}</div>
        <div className="readiness-result-grid"><ResultList title="What looks strong" items={result.strong} empty="No clear strength has been evidenced yet." /><ResultList title="What needs attention" items={result.attention} empty="No immediate weaker area was identified." /><ResultList title="Trustees’ Annual Report readiness" items={result.trusteesReportReadiness} empty="The Trustees’ Annual Report view remains limited by the evidence available." /><ResultList title="Wider impact evidence" items={result.widerImpactEvidence} empty="No separate wider impact evidence materially changed this assessment." /><ResultList title="User-confirmed current practice" items={result.userConfirmedPractice} empty="No current practice was confirmed beyond the structured assessment answers." /><ResultList title="MUST areas" items={result.must} empty="No applicable MUST area was flagged by this assessment." /><ResultList title="SHOULD opportunities" items={result.should} empty="No weaker SHOULD opportunity was identified." /><ResultList title="MAY options" items={result.may} empty="No additional MAY option was identified." /><ResultList title="MSI JUDGEMENT areas" items={result.judgement} empty="No specific judgement area was flagged, although context still matters." /><ResultList title="Additional SORP checks" items={result.additionalChecks} empty="No additional check was triggered by the information supplied." /><ResultList title="Three priority actions" items={result.priorities} empty="Add more context to build practical priorities." /></div>
      </section>
      {intelligence && <details className="readiness-intelligence" aria-label="Effective intelligence provenance">
        <summary>{intelligence.layers.filter((layer) => layer.id === "msi-core" || layer.id === "sorp-readiness-intelligence").map((layer) => `${intelligenceLayerLabel(layer)} · ${layer.label}`).join(" · ")}</summary>
        <div><p><strong>{intelligence.registry} · {intelligence.effectiveVersion}</strong><span>Published intelligence only · {intelligence.mode === "CURRENT" ? "latest for this new session" : intelligence.mode === "PINNED" ? "pinned for this conversation" : "last known published — Cow Console was temporarily unavailable"}</span></p>{intelligence.layers.map((layer) => <p key={`${layer.id}-${layer.version}`}><strong>{intelligenceLayerLabel(layer)} · {layer.label}</strong><span>{layer.relationship.toLowerCase()} · {layer.status.toLowerCase()} · published {layer.publishedAt ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(layer.publishedAt)) : "date unavailable"}</span></p>)}{intelligence.runtimeControls.map((control) => <p key={`${control.name}-${control.type}`}><strong>{control.name} · {control.type}</strong><span>Represented by {control.representedBy}</span></p>)}</div>
      </details>}
    </SorpResultActions>
  </div>;

  if (!started) return <section className="readiness-intro">
    <p className="readiness-kicker">SORP 2026<br /><strong>Completely free</strong></p>
    <h1>{setupOnly ? <>A quick route.<br />The right context first.</> : <>Talk it through.<br />Get your free report.</>}</h1>
    <div className="readiness-intro-copy">{setupOnly && <p>We’ll find your organisation and establish what applies, then take you straight to the 15-question snapshot.</p>}<p>You’re about to talk to <strong>My Social Impact Intelligence</strong>: specialist guidance built from MSI’s SORP and social impact expertise.</p><p>First we’ll establish whether SORP 2026 applies, then gather the context and explore your readiness for its narrative and impact-reporting expectations. You’ll see what we know, why we’re asking and the SORP basis as we go.</p><p>At the end, you’ll receive your personalised SORP readiness report. <strong>There is no charge, no card and no surprise paywall.</strong></p></div>
    <div className="readiness-intro-actions"><button type="button" onClick={() => startConversation(false)}>{setupOnly ? "Find my organisation" : "Start my free conversation"} <span>→</span></button>{!setupOnly && (snapshotAvailable ? <button type="button" className="is-secondary" onClick={() => startConversation(true)}>Use my completed Snapshot <span>→</span></button> : <SorpSnapshotLink className="is-secondary" startLabel="Take the 15-question shortcut" />)}</div>
    {!setupOnly && <p className="readiness-intro-note"><strong>Prefer to whiz through?</strong> The Quick Snapshot takes around eight minutes. Both routes produce the same free initial report, and you can return to the conversation afterwards. Create an account at any point to save and resume across devices. <button type="button" className="readiness-sign-in-link" onClick={() => { startConversation(false); setAccountMode("login"); setSaveStatus("idle"); setSaveError(""); setSaveDialogOpen(true); }}>Already have an account? Sign in.</button></p>}
  </section>;

  return <div className="readiness-chat">
    <SorpJourneyProgress current={progressCurrentStage} completed={progressCompletedStages} result={Boolean(result && reviewIndex === null)} />

    <div className="sorp-journey-body">
    <aside className="sorp-journey-aside">
      {activeWorkflow && <SorpStageContext workflow={activeWorkflow} income={state.setup.income} impactReportConfirmed={state.impactReportConfirmation === "confirmed" || state.impactReportInput === "uploaded"} accountEmail={account?.email} organisation={contextMessage?.organisation} publicSources={contextMessage?.publicSources} />}
      {!contextMessage?.organisation && !activeWorkflow?.known.some((item) => item.established) && currentStage === 1 && <section className="sorp-context-intro"><span>What we’re going to do</span><h2>We’ll do the public homework first.</h2><p>We’ll use public information to do as much of the work as possible for you. We’ll look for your charity record, accounts and Trustees’ Annual Report, establish the SORP context, then give you a Quick Readiness Review.</p><small>Completely free · No card required</small></section>}
    </aside>

    <div className="readiness-thread" aria-live="polite">
      {setupOnly && workflow?.completedStages.includes(2) && <button type="button" className="sorp-setup-continue" onClick={() => onSetupComplete?.(state, workflow)}>✓ Context established — continue to the 15 questions →</button>}
      {reviewCheckpoint && <section className="sorp-reviewing-answer" aria-live="polite"><span>Reviewing saved question {reviewIndex! + 1} of {checkpoints.length}</span><strong>{reviewCheckpoint.answerText || "Saved answer"}</strong>{reviewCheckpoint.note && <p>{reviewCheckpoint.note}</p>}<small>{activeWorkflow?.next.id.match(/^(?:field:\d+|check:)/) ? "Choose another quick answer below to change this. Your later answers will be kept." : "This answer and its conversation are preserved exactly as supplied."}</small></section>}
      {activeMessages.length > 1 && <details className="sorp-conversation-history"><summary>Our conversation up to this question <span>{activeMessages.filter(message => message.role === "user").length} replies</span></summary>{activeMessages.slice(0, -1).map((message, index) => <article key={index}><small>{message.role === "user" ? "You" : "My Social Impact Intelligence"}</small><MessageContent text={message.content} />{message.organisation && <strong>{message.organisation.name} · {message.organisation.locality}</strong>}</article>)}</details>}
      {completionNotice && !isStageOnePayoff && <p className="sorp-completion-notice" role="status">{completionNotice}</p>}
      {activeMessages.map((message, index) => index === activeMessages.length - 1 && <article id="readiness-current-question" key={`${index}-${message.content.slice(0, 24)}`} className={`readiness-message is-${message.role}${message.responseKind === "detour" ? " is-detour" : ""}`}>
        <span>{message.role === "user" ? "You" : "My Social Impact Intelligence"}</span>
        {message.label && message.responseKind === "detour" && <strong className={`readiness-label is-${message.label.toLowerCase().replace(" ", "-")}`}>{message.label === "JUDGEMENT" ? "MSI JUDGEMENT" : message.label}</strong>}
        {message.workflow?.next.id !== "publicSearchCheckpoint" && <div><MessageContent text={message.organisation ? "I think I’ve found you." : message.content} /></div>}
        {message.workflow?.next.id === "publicSearchCheckpoint" && <PublicSearchCheckpoint workflow={message.workflow} />}
        {message.role === "assistant" && !message.organisation && message.responseKind === "detour" && <section className="sorp-question-purpose"><strong>What we need next</strong><p>{message.workflow?.next.question}</p></section>}
        {message.organisation && <p className="sorp-confirm-question">Is this the right organisation?</p>}
        {message.responseKind === "detour" && message.citations?.length ? <SorpBasisDrawer basis={{classification: message.label || "MSI JUDGEMENT", explanation: "The SORP passages relevant to your question.", citations: message.citations}} /> : null}
        {!message.organisation && message.publicSources?.length ? <details><summary>Sources</summary><div>{message.publicSources.map((source) => <article key={`${source.url}-${source.detail}`}><strong>{sourceKindLabel(source.kind)} · {source.label}</strong>{source.detail && <p>{source.detail}</p>}<a href={source.url}>View source <span>→</span></a></article>)}</div></details> : null}
      </article>)}
      {busy && <article className="readiness-message is-assistant is-loading" role="status" aria-live="polite"><span>My Social Impact Intelligence</span><div><p>{workingStatus}</p></div></article>}
      {error && <div className="readiness-error" role="alert"><strong>That step did not complete.</strong><p>{error}</p><button type="button" onClick={() => { setError(""); composerRef.current?.focus(); }}>Try again</button></div>}
      {intelligence && <details className="readiness-intelligence" aria-label="Effective intelligence provenance">
        <summary>{intelligence.layers.filter((layer) => layer.id === "msi-core" || layer.id === "sorp-readiness-intelligence").map((layer) => `${intelligenceLayerLabel(layer)} · ${layer.label}`).join(" · ")}</summary>
        <div>
          <p><strong>{intelligence.registry} · {intelligence.effectiveVersion}</strong><span>Published intelligence only · {intelligence.mode === "CURRENT" ? "latest for this new session" : intelligence.mode === "PINNED" ? "pinned for this conversation" : "last known published — Cow Console was temporarily unavailable"}</span></p>
          {intelligence.layers.map((layer) => <p key={`${layer.id}-${layer.version}`}><strong>{intelligenceLayerLabel(layer)} · {layer.label}</strong><span>{layer.relationship.toLowerCase()} · {layer.status.toLowerCase()} · published {layer.publishedAt ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(layer.publishedAt)) : "date unavailable"}</span></p>)}
          {intelligence.runtimeControls.map((control) => <p key={`${control.name}-${control.type}`}><strong>{control.name} · {control.type}</strong><span>Represented by {control.representedBy}</span></p>)}
        </div>
      </details>}
      <div ref={threadEndRef} />
    </div>

    </div>
    <form className={`readiness-composer${activityQuestion ? " is-activity-composer" : ""}${activitySelectionCount ? " has-activity-selections" : ""}${reviewIndex !== null ? " is-reviewing" : ""}`} onSubmit={submit}>
      <input ref={reportInputRef} type="file" accept="application/pdf,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadReport(file); }} />
      <div className="sorp-response-utility">
      <nav className="sorp-bottom-navigation" aria-label="Assessment navigation">
        <span className="sorp-bottom-utility"><button type="button" className="is-back" aria-label="Back to previous question" onClick={goBack} disabled={!checkpoints.length || busy || quickAdvancing || recordingState !== "idle"}>← Back</button>
        <button type="button" className="is-save" onClick={() => { setSaveStatus("idle"); setSaveError(""); setSaveDialogOpen(true); }}>Save &amp; exit</button></span>
        {reviewIndex !== null && <button type="button" className="is-next" onClick={goNext}>{reviewIndex < checkpoints.length - 1 ? "Next →" : result ? "Return to my report →" : "Return to current question →"}</button>}
      </nav>
      {quickReview && <div className="sorp-quick-review-response-tools"><button type="button" className="sorp-correct-context" onClick={() => { setComposer("Something has changed: "); window.setTimeout(() => composerRef.current?.focus(), 40); }}>Changed significantly? Correct this →</button><QuickReviewFeedback value={quickReviewFeedback} comment={quickReviewFeedbackComment} onSelect={recordQuickReviewFeedback} onComment={recordQuickReviewFeedbackComment} /></div>}
      {quickReview && <details className="sorp-mobile-review-tools"><summary>Rate your Quick Review · optional</summary><QuickReviewFeedback value={quickReviewFeedback} comment={quickReviewFeedbackComment} onSelect={recordQuickReviewFeedback} onComment={recordQuickReviewFeedbackComment} /><button type="button" className="sorp-correct-context" onClick={() => { setComposer("Something has changed: "); window.setTimeout(() => composerRef.current?.focus(), 40); }}>Changed significantly? Correct this →</button></details>}
      </div>
      <section className="sorp-response-fields" aria-label="Respond to MSI Intelligence">
      {showResponseActions && <nav className={`readiness-message-actions${/^(?:field:\d+|check:)/.test(responseQuestionId) ? " is-assessment-scale" : ""}${responseQuestionId === "activities" ? " is-multi-select" : ""}`} aria-label={responseQuestionId === "activities" ? "Choose all activities that apply" : /^(?:field:\d+|check:)/.test(responseQuestionId) ? "Choose a quick answer" : "Choose an answer"}>{responseActions.map((action) => {
        const selected = responseQuestionId === "activities" && activitySelections.includes(action.value);
        const saved = reviewCheckpoint?.answerText?.toUpperCase().startsWith(action.label.toUpperCase().replace(/^KEEP\s+/, ""));
        return <button aria-pressed={responseQuestionId === "activities" ? selected : saved || undefined} className={[action.label === "SKIP FOR NOW" ? "is-skip" : "", selected || saved ? "is-selected" : ""].filter(Boolean).join(" ") || undefined} key={`${action.label}-${action.value}`} type="button" disabled={busy || quickAdvancing} onClick={() => selectStructuredAnswer(action.value)}>{action.label}<span>{selected || saved ? "✓" : "→"}</span></button>;
      })}</nav>}
      {responseQuestionId === "impactReportLink" && <ImpactReportUploader onChoose={chooseReportFile} dragging={reportDragging} onDragEnter={(event) => { event.preventDefault(); setReportDragging(true); }} onDragLeave={(event) => { event.preventDefault(); setReportDragging(false); }} onDragOver={(event) => { event.preventDefault(); setReportDragging(true); }} onDrop={dropReport} busy={busy} />}
      {responseQuestionId === "activities" && <p className="sorp-multi-select-help"><strong>Choose all that apply.</strong><span>Select more than one if needed, then add a little detail below if it would help.</span></p>}
      {pendingStructuredAnswer && <section className="sorp-structured-confirmation" aria-live="polite">
        <strong>✓ {pendingStructuredAnswer.label}</strong>
        <h3>Happy with this answer?</h3>
        <button type="button" onClick={() => void confirmStructuredAnswer(composer)} disabled={quickAdvancing || recordingState !== "idle"}>Continue <span>→</span></button>
        <p><b>Want to explain why?</b><span>Add a note in your own words — completely optional.</span></p>
      </section>}
      <label htmlFor="readiness-answer" aria-live="polite">Or tell us in your own words — or ask {impactMode ? "an impact" : "a SORP"} question.</label>
      <textarea ref={composerRef} id="readiness-answer" rows={2} value={composer} onChange={(event) => setComposer(event.target.value)} placeholder={activityQuestion ? "Add detail—or ask us why this matters…" : pendingStructuredAnswer ? "Add an optional note…" : "Type or say what you know…"} maxLength={4000} />
      <div className="readiness-submit-row"><button type="button" className="readiness-mic" onClick={recordingState === "recording" ? stopRecording : () => void startRecording()} disabled={busy || quickAdvancing || recordingState === "transcribing"}>{recordingState === "recording" ? `Stop · ${recordingTime(recordingSeconds)}` : recordingState === "transcribing" ? "Transcribing…" : "Use microphone"}</button><button type="submit" className={busy || quickAdvancing ? "is-working" : undefined} disabled={busy || quickAdvancing || (!pendingStructuredAnswer && !(activityQuestion && activitySelections.length) && composer.trim().length < 2) || recordingState !== "idle"}>{busy ? "Understanding…" : quickAdvancing ? "Saving…" : reviewIndex !== null ? "Save revised answer" : conversationFirstMessage ? "Send message" : activityQuestion && activitySelections.length ? "Continue with choices" : result ? "Keep talking" : "Continue"} <span>→</span></button></div>
      </section>
    </form>
    {saveDialogOpen && <div className="sorp-save-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && saveStatus !== "saving") setSaveDialogOpen(false); }}><section className="sorp-save-dialog" role="dialog" aria-modal="true" aria-labelledby="sorp-save-title">
      <button type="button" className="sorp-save-close" onClick={() => setSaveDialogOpen(false)} disabled={saveStatus === "saving"} aria-label="Close finish another time form">×</button>
      <span>Finish another time</span><h2 id="sorp-save-title">{account ? "Save your assessment" : accountMode === "signup" ? "Create your account" : "Sign in to your account"}</h2><p>{account ? `You’re signed in as ${account.email}. Save now and your assessment will be available when you return.` : accountMode === "signup" ? "Create an account so your answers and conversation are saved securely and you can continue on this or another device." : "Sign in to reopen the assessment already saved to your account."}</p>
      <form onSubmit={submitSave}>
        {!account && accountMode === "signup" && <><label htmlFor="save-name">Your name<input id="save-name" name="name" autoComplete="name" required maxLength={120} value={saveProfile.name} onChange={(event) => setSaveProfile((current) => ({ ...current, name: event.target.value }))} /></label>
        <label htmlFor="save-position">Position / role<input id="save-position" name="position" autoComplete="organization-title" required maxLength={120} value={saveProfile.position} onChange={(event) => setSaveProfile((current) => ({ ...current, position: event.target.value }))} /></label></>}
        {!account && <>
        <label htmlFor="save-email">Email address<input id="save-email" name="email" type="email" autoComplete="email" required maxLength={254} value={saveProfile.email} onChange={(event) => setSaveProfile((current) => ({ ...current, email: event.target.value }))} /></label>
        <label htmlFor="save-password">Password<input id="save-password" name="password" type="password" autoComplete={accountMode === "signup" ? "new-password" : "current-password"} required minLength={10} maxLength={200} value={saveProfile.password} onChange={(event) => setSaveProfile((current) => ({ ...current, password: event.target.value }))} /></label>
        {accountMode === "signup" && <label htmlFor="save-confirm-password">Confirm password<input id="save-confirm-password" name="confirm-password" type="password" autoComplete="new-password" required minLength={10} maxLength={200} value={saveProfile.confirmPassword} onChange={(event) => setSaveProfile((current) => ({ ...current, confirmPassword: event.target.value }))} /></label>}
        <p className="sorp-save-security">Your password is protected server-side. Your account lets you return to this assessment without relying on this browser.</p>
        <button type="button" className="sorp-account-switch" onClick={() => { setAccountMode((current) => current === "signup" ? "login" : "signup"); setSaveError(""); }}>{accountMode === "signup" ? "Already have an account? Sign in" : "Need an account? Create one"}</button>
        </>}
        {saveError && <div className="sorp-save-error" role="alert" aria-live="assertive"><strong>Sorry — we couldn’t save your account.</strong><span>{saveError}</span><span>You can correct anything above and try again without losing your place.</span></div>}
        {saveStatus === "saved" ? <p className="sorp-save-success" role="status">✓ {accountMode === "login" && !account ? "Signed in." : "Saved to your account. You can finish another time."}</p> : <button type="submit" disabled={saveStatus === "saving"}>{saveStatus === "saving" ? "Saving…" : account ? "Save and finish another time" : accountMode === "signup" ? "Create account and save" : "Sign in and continue"} <span>→</span></button>}
      </form>
    </section></div>}
  </div>;
}
