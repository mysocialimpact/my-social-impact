"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { coreQuestions, answerOptions, tierLabel, type AnswerValue, type AssessmentSetup } from "./sorp-questionnaire";
import { trackSorpEvent } from "./sorp-growth";
import { supportPence, type SupportChoice } from "./sorp-payment-amounts";
import { SorpPublicSupportCheckout } from "./sorp-public-support-checkout";
import { SorpReviewBooking } from "./sorp-review-booking";
import { band, classificationLabel, emailResult, emptyLens, highlights, verifiedTar, weights, type Candidate, type Finding, type Intelligence, type Lens, type Report, type Research } from "./sorp-public-model";
import "./sorp-candidate-review.css";

type Step = "intro" | "benefits" | "find" | "confirmation" | "homework" | "quick-generating" | "tar-recovery" | "quick-ready" | "quick" | "quick-feedback" | "method" | "criterion" | "complete" | "generating" | "report-ready" | "report" | "email-ready" | "final-feedback" | "support" | "before-go" | "next" | "help" | "done" | "non-sorp";
type Correction = { answer?: AnswerValue; context: string; savedContext?: string; reviewed: boolean };
type Saved = { sessionId: string; step: Step; query: string; research: Research | null; candidate: Candidate | null; state: unknown; intelligence: Intelligence | null; verifiedTar: Lens | null; report: Report | null; email: string; emailConfirm: string; name: string; role: string; roleOther: string; criterion: number; corrections: Record<string, Correction>; reportView: number; emailSent: boolean; supportPaid: boolean; quickRating: number; quickComment: string; finalRating: number; finalComment: string };
type ReviewLocation = Pick<Saved, "step" | "criterion" | "reportView">;
type ReviewHistory = { past: ReviewLocation[]; current: ReviewLocation; future: ReviewLocation[] };
const KEY = "msi-sorp-final-candidate-v1";
const HISTORY_KEY = `${KEY}-history`;
const BUILD = "27 SEPTEMBER 2026";
const SORP_SOURCE = "https://www.charitysorp.org/documents/d/guest/charities-sorp-2026-1";
const initial: Saved = { sessionId: "", step: "intro", query: "", research: null, candidate: null, state: null, intelligence: null, verifiedTar: null, report: null, email: "", emailConfirm: "", name: "", role: "", roleOther: "", criterion: 0, corrections: {}, reportView: 0, emailSent: false, supportPaid: false, quickRating: 0, quickComment: "", finalRating: 0, finalComment: "" };
const locationOf = ({ step, criterion, reportView }: Saved): ReviewLocation => ({ step, criterion, reportView });
const sameLocation = (left: ReviewLocation, right: ReviewLocation) => left.step === right.step && left.criterion === right.criterion && left.reportView === right.reportView;
const isLocation = (value: unknown): value is ReviewLocation => Boolean(value && typeof value === "object" && typeof (value as ReviewLocation).step === "string" && Number.isInteger((value as ReviewLocation).criterion) && Number.isInteger((value as ReviewLocation).reportView));
const isTransient = (step: Step) => step === "quick-generating" || step === "generating";
const phases = ["Find charity", "Public homework", "Quick review", "Current readiness", "Your report", "What next"];
const scale = answerOptions.map(({ value, label }) => ({ value, label: label.toUpperCase() }));
const phaseFor = (step: Step) => step === "intro" || step === "benefits" || step === "find" || step === "confirmation" ? 0 : step === "homework" ? 1 : step === "quick-generating" || step === "tar-recovery" || step === "quick-ready" || step === "quick" || step === "quick-feedback" ? 2 : step === "method" || step === "criterion" || step === "complete" ? 3 : step === "generating" || step === "report-ready" || step === "report" || step === "email-ready" ? 4 : 5;
const safeLink = (url: string) => /^https:\/\//.test(url) ? url : "";
// Presentation only: the original priority and report data remain unchanged.
function agendaCopy(finding: Finding) {
  const plain = (text: string) => text.replace(/\bcriterion\s+\d+\s*:?\s*/gi, "this reporting area: ").replace(/\bassessment item\b/gi, "reporting area").replace(/\bfiling index(?: page)?\b/gi, "available information").replace(/\bsource page only\b/gi, "available information").replace(/\s*[—–]\s*/g, ". ");
  let title = plain(finding.action).replace(/^Open the downloadable accounts and TAR PDF and check the section on /i, "Check your ").replace(/^Review the TAR PDF for /i, "Check ").replace(/^Check the TAR narrative for /i, "Check ").replace(/\.$/, "");
  if (/^Check (?:your )?purpose[s]? and activities/i.test(title)) title = "Check your purpose and activities";
  if (/^Check the public benefit explanation/i.test(title)) title = "Check your public benefit reporting";
  if (/^Check (?:for )?stated aims, objectives and longer.term direction/i.test(title)) title = "Check your aims and direction";
  const sentences = plain(finding.reason).match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [plain(finding.reason)];
  const reason = (sentences.find(sentence => !/only (?:an index of|lists) filings/i.test(sentence)) || sentences[0]).trim().replace(/^This page|^The public page|^It\b/i, "The reviewed information").replace(/No objectives section is visible on the available information/i, "The reviewed information does not show an objectives section");
  return { title, reason };
}
const quickSteps = ["Reading your Trustees’ Annual Report", "Finding purposes, activities and public benefit", "Looking for achievements, outcomes and impact", "Checking future plans and learning", "Mapping evidence to SORP 2026", "Assessing the 15 areas", "Calculating your published-reporting score"];
const reportSteps = ["Bringing together your published evidence", "Adding your current responses and context", "Comparing published reporting with your current view", "Checking the relevant SORP 2026 requirements", "Prioritising what matters most", "Turning findings into practical next steps", "Preparing your personalised PDF"];
const quickMessages = ["SORP 2026 is our source of truth.", "We assess published reporting across 15 SORP-mapped areas.", "AI interprets the evidence. A fixed method calculates the score.", "This is your published starting point. Next, tell us where things stand today.", "Good impact reporting starts before year-end. Useful information also supports better decisions."];
const quickMessageDuration = (message: string) => Math.max(4000, Math.ceil(message.trim().split(/\s+/).length / 150 * 60000 + 1750));
const reportMessages = ["TWO VIEWS. ONE CLEARER PICTURE.\nWe are comparing your published report with where you say things stand today.", "SORP IS THE REQUIREMENT. BETTER IMPACT IS THE OPPORTUNITY.\nStrong impact information should also support better decisions throughout the year.", "DON’T WAIT UNTIL YEAR-END.\nThe best reporting grows from evidence and learning already in use.", "BUILT WITH THE IDEAS SHED.\nWe build useful digital tools for charities and purpose-led organisations. More tools are coming."];
const roles = ["CEO / SENIOR LEADER", "TRUSTEE / CHAIR", "FINANCE / TREASURER", "IMPACT / EVALUATION", "PROGRAMME / DELIVERY", "FUNDRAISING / DEVELOPMENT", "COMMUNICATIONS / MARKETING", "ACCOUNTANT / AUDITOR / ADVISER", "OTHER"];
const areaLabels = ["Purpose", "Public benefit", "Objectives", "Programmes", "Measures", "Outputs & outcomes", "Impact evidence", "Achievements", "Performance", "Claims", "Learning", "External factors", "Future plans", "Narrative & finances", "Findability"];
const pause = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

async function post(url: string, body: unknown) {
  const multipart = body instanceof FormData;
  const response = await fetch(url, { method: "POST", headers: multipart ? undefined : { "content-type": "application/json" }, body: multipart ? body : JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok || data.error) { const failure = new Error(data.error || "That step could not be completed. Please try again.") as Error & { recovery?: string }; failure.recovery = data.recovery; throw failure; }
  return data;
}

function FindingSource({ finding }: { finding: Finding }) {
  return <div className="scr-sources"><p><strong>Published evidence</strong> {finding.excerpt || "We could not establish this from the inspected statutory reporting. That is not proof the practice is absent."}</p>{safeLink(finding.sourceUrl) && <a href={finding.sourceUrl} target="_blank" rel="noreferrer">View published source ↗</a>}<p><strong>SORP basis</strong> {classificationLabel(finding.classification)}{["JUDGEMENT", "MSI_READINESS"].includes(finding.classification) ? ". MSI judgement is not an official SORP category." : ""}</p>{finding.sources.map(source => <p key={`${source.reference}-${source.page}`}><a href={`${SORP_SOURCE}#page=${source.page}`} target="_blank" rel="noreferrer">SORP 2026 · {source.reference} · p.{source.page} ↗</a><br />{source.text}</p>)}</div>;
}

function ProgressSequence({ items, complete, active = 0 }: { items: string[]; complete: number; active?: number }) {
  return <ol className="scr-progress-sequence" aria-label="Review progress">{items.map((item, index) => <li key={item} className={index < complete ? "is-complete" : index === active ? "is-active" : ""}><span aria-hidden="true">{index < complete ? "✓" : index === active ? "◉" : "○"}</span>{item}</li>)}</ol>;
}

function EvidenceChecklist({ candidate, research, tier, busy, phase, visible = 8 }: { candidate: Candidate | null; research: Research | null; tier: string; busy: boolean; phase: "identity" | "homework"; visible?: number }) {
  const found = candidate || research?.candidates[0] || null;
  const checks: [string, boolean][] = phase === "identity" ? [
    ["Searching the Charity Commission", Boolean(research)],
    ["Registered charity found", found?.entityType === "registered_charity"],
    ["Official website found", Boolean(safeLink(found?.website || ""))],
  ] : [
    ["Finding the latest published accounts", Boolean(candidate?.reportUrl)],
    ["Finding the Trustees’ Annual Report", Boolean(candidate?.reportUrl && candidate?.reportTitle)],
    ["Confirming the reporting period", Boolean(candidate?.reportPeriod)],
    ["Checking the accounting basis", Boolean(candidate && ["HIGH", "ESTABLISHED"].includes(candidate.accountingBasisConfidence?.toUpperCase()))],
    ["Finding published gross income", candidate?.latestIncome !== null && candidate?.latestIncome !== undefined],
    ["Checking whether SORP applies", Boolean(candidate && candidate.entityType === "registered_charity" && candidate.accountingBasis !== "unknown")],
    ["Identifying the SORP 2026 tier", tier !== "Not yet confirmed"],
    ["Matching the relevant reporting requirements", tier !== "Not yet confirmed" && candidate?.entityType === "registered_charity"],
  ];
  return <ol className="scr-progress-sequence scr-evidence-checklist" aria-label="Public evidence checks">{checks.map(([label, established], index) => { const done = established && index < visible; return <li key={label} className={done ? "is-complete" : busy && index === checks.findIndex((item, position) => !item[1] || position >= visible) ? "is-active" : ""}><span aria-hidden="true">{done ? "✓" : "○"}</span>{label}</li>; })}</ol>;
}

function FeedbackPanel({ rating, comment, status, onRating, onComment, onCommentBlur, quick = false, overall = false }: { rating: number; comment: string; status: string; onRating: (value: number) => void; onComment: (value: string) => void; onCommentBlur: () => void; quick?: boolean; overall?: boolean }) {
  return <div className="scr-feedback">{(quick || overall) && <h2 className="scr-feedback-question">{overall ? "HOW USEFUL HAS THIS EXPERIENCE BEEN?" : "HAS THIS BEEN USEFUL SO FAR?"}</h2>}<div className="scr-stars" role="group" aria-label="Usefulness rating">{[1, 2, 3, 4, 5].map(value => <button key={value} type="button" aria-label={`${value} out of 5`} aria-pressed={rating === value} onClick={() => onRating(value)}>{value <= rating ? "★" : "☆"}</button>)}</div><div className="scr-star-scale"><span>1 = {quick || overall ? "NOT YET USEFUL" : "NOT VERY USEFUL"}</span><span>5 = EXTREMELY USEFUL</span></div><label className="scr-context">{overall ? "WHAT WOULD MAKE THIS BETTER FOR THE NEXT CHARITY?" : "ANYTHING WE COULD IMPROVE?"}{overall && <span className="scr-feedback-comment-help">Your feedback genuinely helps us improve the tool.</span>}{quick && <span className="scr-feedback-comment-help">Your comments genuinely help us make this better.</span>}<textarea rows={3} value={comment} onChange={e => onComment(e.target.value)} onBlur={onCommentBlur} placeholder="Optional" maxLength={2000}/></label>{status && <p className={status === "error" ? "scr-feedback-error" : "scr-saved"} role="status">{status === "saving" ? "SAVING FEEDBACK…" : status === "saved" ? "✓ FEEDBACK SAVED" : "Feedback could not be sent just now. You can still continue."}</p>}</div>;
}

const quickFindingTitles = ["Purpose & activities", "Public benefit", "Objectives & longer-term aims", "Programmes & intended change", "Success measures", "Outputs, outcomes & impact", "Evidence behind impact", "Achievements & difference made", "Performance against aims", "Proportionate impact claims", "Learning & improvement", "External influences", "Future plans", "Narrative & finances", "Accessible reporting"];
const quickFindingTitle = (finding: Finding) => quickFindingTitles[finding.fieldId - 1] || `Assessment area ${finding.fieldId}`;

function QuickFindingLabel({ finding }: { finding: Finding }) {
  if (["MUST", "SHOULD", "MAY"].includes(finding.classification)) return <span className={`scr-quick-label scr-quick-label--${finding.classification.toLowerCase()}`}>{finding.classification}</span>;
  if (["JUDGEMENT", "MSI_READINESS"].includes(finding.classification)) return <span className="scr-quick-judgement">JUDGEMENT REQUIRED</span>;
  return null;
}

function QuickReviewResult({ lens }: { lens: Lens }) {
  const { strong, gaps, priorities } = highlights(lens);
  const judgementCount = lens.findings.filter(finding => ["JUDGEMENT", "MSI_READINESS"].includes(finding.classification)).length;
  return <div className="scr-quick-result">
    <div className="scr-quick-heading"><p className="scr-kicker">YOUR QUICK REVIEW IS READY ✓</p><h1>YOUR SORP 2026 STARTING POINT</h1><p>Based on what your latest published Trustees’ Annual Report and accounts demonstrate.</p></div>
    <div className="scr-quick-payoff">
      <div className="scr-quick-number" aria-label={lens.score === null ? "No score established" : `${lens.score} out of 100`}><strong>{lens.score ?? "—"}</strong><span>/100</span></div>
      <div className="scr-quick-verdict"><span className="scr-quick-baseline">PUBLISHED BASELINE</span><h2>{band(lens.score)}</h2><p className="scr-quick-confidence">Confidence: <strong>{lens.confidence}</strong></p></div>
    </div>
    <p className="scr-quick-context">This is your published starting point. Next, you’ll update the picture with what has changed since the report.</p>
    <section className="scr-quick-snapshot" aria-labelledby="scr-quick-snapshot-heading">
      <h2 id="scr-quick-snapshot-heading">SORP SNAPSHOT</h2>
      <div className="scr-quick-category-grid">{["MUST", "SHOULD", "MAY"].map(category => {
        const findings = lens.findings.filter(finding => finding.classification === category);
        const clear = findings.filter(finding => finding.answer === "yes").length;
        const unknown = findings.filter(finding => finding.answer === "not_sure").length;
        return <div className="scr-quick-category" key={category}><span className={`scr-quick-label scr-quick-label--${category.toLowerCase()}`}>{category}</span>{findings.length ? <><p><strong>{clear}</strong> clearly evidenced</p><p><strong>{findings.length - clear}</strong> {category === "MAY" ? "optional areas to explore" : "to review"}</p>{unknown > 0 && <small>{unknown} not established in the report</small>}</> : <p className="scr-quick-category-empty">No {category}-classified areas in this review.</p>}</div>;
      })}</div>
      <p className="scr-quick-snapshot-note">Counts show the assessed areas within each SORP category, not a separate compliance score.</p>
      {judgementCount > 0 && <div className="scr-quick-interpretation"><span className="scr-quick-judgement">JUDGEMENT REQUIRED</span><p>{judgementCount} {judgementCount === 1 ? "area involves" : "areas involve"} MSI interpretation, separate from the SORP categories.</p></div>}
    </section>
    <div className="scr-quick-findings">{[{ title: "WHAT LOOKS STRONG", items: strong, kind: "strong", empty: "No clear strengths could be established from the material inspected." }, { title: "IMPORTANT GAPS", items: gaps, kind: "gaps", empty: "No material gaps were identified in the inspected material." }].map(section => <section className={`scr-quick-findings-${section.kind}`} key={section.kind}><h2><span aria-hidden="true">{section.kind === "strong" ? "✓" : "↗"}</span>{section.title}</h2>{section.items.length ? section.items.slice(0, 3).map(finding => <article key={finding.fieldId}><QuickFindingLabel finding={finding}/><h3>{quickFindingTitle(finding)}</h3><p>{finding.finding}</p></article>) : <p>{section.empty}</p>}</section>)}</div>
    <section className="scr-quick-priorities" aria-labelledby="scr-quick-priorities-heading"><h2 id="scr-quick-priorities-heading">TOP PRIORITIES</h2><ol>{priorities.slice(0, 3).map((finding, index) => {
      const needsEvidence = finding.action === "Check the source and establish what can be evidenced for the next report.";
      return <li key={finding.fieldId}><span className="scr-quick-priority-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><div><QuickFindingLabel finding={finding}/><h3>{needsEvidence ? `Establish the evidence for ${quickFindingTitle(finding).toLowerCase()}.` : finding.action}</h3>{needsEvidence && <p>Check what can be evidenced in your next Trustees’ Annual Report.</p>}</div></li>;
    })}</ol>{!priorities.length && <p>No additional priorities were identified in the inspected material.</p>}</section>
    <div className="scr-quick-next"><span aria-hidden="true">→</span><div><h2>YOUR PUBLISHED REPORT IS THE STARTING POINT.</h2><p>Next, update the picture with what has changed and see where you believe your SORP readiness stands now.</p></div></div>
  </div>;
}

function ReportHighlights({ lens }: { lens: Lens }) {
  const { strong, gaps, priorities } = highlights(lens);
  const judgement = lens.findings.filter(f => ["JUDGEMENT", "MSI_READINESS"].includes(f.classification));
  return <div className="scr-quick-result scr-report-highlights">
    <section className="scr-quick-snapshot"><h2>YOUR SORP SNAPSHOT</h2><p className="scr-quick-snapshot-note">From the published evidence behind your Quick Review. Your current answers remain self-reported.</p><div className="scr-quick-category-grid">{["MUST", "SHOULD", "MAY"].map(category => {
      const findings = lens.findings.filter(f => f.classification === category);
      const clear = findings.filter(f => f.answer === "yes").length;
      return <div className="scr-quick-category" key={category}><span className={`scr-quick-label scr-quick-label--${category.toLowerCase()}`}>{category}</span>{findings.length ? <><p><strong>{clear}</strong> clearly evidenced</p><p><strong>{findings.length - clear}</strong> {category === "MUST" ? "need attention" : category === "SHOULD" ? "areas for stronger practice" : "optional opportunities"}</p></> : <p className="scr-quick-category-empty">No {category}-classified areas in this review.</p>}</div>;
    })}</div>{judgement.length > 0 && <div className="scr-quick-interpretation"><span className="scr-quick-judgement">JUDGEMENT REQUIRED</span><p>{judgement.map(quickFindingTitle).join(" · ")}. MSI interpretation, separate from the SORP categories.</p></div>}</section>
    <div className="scr-quick-findings">{[{ title: "WHAT LOOKS STRONG", items: strong, kind: "strong" }, { title: "IMPORTANT GAPS", items: gaps, kind: "gaps" }].map(section => <section className={`scr-quick-findings-${section.kind}`} key={section.kind}><h2>{section.title}</h2>{section.items.slice(0, 3).map(f => <article key={f.fieldId}><QuickFindingLabel finding={f}/><h3>{quickFindingTitle(f)}</h3><p>{f.finding}</p></article>)}{!section.items.length && <p>No {section.kind === "strong" ? "strengths" : "material gaps"} identified in the inspected evidence.</p>}</section>)}</div>
    <section className="scr-quick-priorities"><h2>TOP PRIORITIES</h2><ol>{priorities.slice(0, 3).map((f, index) => <li key={f.fieldId}><span className="scr-quick-priority-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><div><QuickFindingLabel finding={f}/><h3>{f.action === "Check the source and establish what can be evidenced for the next report." ? `Establish the evidence for ${quickFindingTitle(f).toLowerCase()}.` : f.action.replace(/\b(?:criterion|question|item)\s+\d+\b/gi, quickFindingTitle(f).toLowerCase())}</h3><p>{f.reason}</p></div></li>)}</ol>{!priorities.length && <p>No additional priorities identified in the inspected evidence.</p>}</section>
  </div>;
}

export function SorpCandidateReview() {
  const [saved, setSaved] = useState<Saved>(initial);
  const [navigation, setNavigation] = useState<ReviewHistory>({ past: [], current: locationOf(initial), future: [] });
  const [loaded, setLoaded] = useState(false);
  const hydrated = useRef(false);
  const emailAttempt = useRef<string | null>(null);
  const previousSaved = useRef<Saved | null>(null);
  const [busy, setBusy] = useState("");
  const [homeworkReveal, setHomeworkReveal] = useState(8);
  const [error, setError] = useState("");
  const [generation, setGeneration] = useState<string[]>([]);
  const [progressClock, setProgressClock] = useState(0);
  const [quickFinishing, setQuickFinishing] = useState(false);
  const quickMessageShownAt = useRef(0);
  const quickMessageIndex = useRef(0);
  const [generationReady, setGenerationReady] = useState(false);
  const [milestone, setMilestone] = useState("");
  const [support, setSupport] = useState<SupportChoice>(5);
  const [custom, setCustom] = useState("");
  const [checkout, setCheckout] = useState<{ clientSecret: string; sessionId: string } | null>(null);
  const [emailMismatch, setEmailMismatch] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState<{ quick: string; final: string }>({ quick: "", final: "" });

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    let restored: Saved;
    try { const stored = JSON.parse(localStorage.getItem(KEY) || "null"); restored = stored?.sessionId ? { ...initial, ...stored, emailConfirm: stored.emailConfirm || stored.email || "", reportView: Math.min(stored.reportView || 0, 1), corrections: Object.fromEntries(Object.entries(stored.corrections || {}).map(([id, value]) => { const correction = (value && typeof value === "object" ? value : { context: "", reviewed: false }) as Correction; return [id, { ...correction, savedContext: correction.savedContext ?? correction.context }]; })), step: stored.step === "email-ready" ? "final-feedback" : stored.step === "generating" ? "complete" : stored.step === "quick-generating" ? "homework" : stored.step } : { ...initial, sessionId: crypto.randomUUID() }; if (restored.report && !verifiedTar(restored.report.tar)) restored = { ...restored, report: null, verifiedTar: null, emailSent: false, step: "homework", reportView: 0 }; if (!verifiedTar(restored.verifiedTar)) restored.verifiedTar = verifiedTar(restored.report?.tar) ? restored.report!.tar : null; }
    catch { restored = { ...initial, sessionId: crypto.randomUUID() }; setError("This browser could not restore a saved review. Please keep this page open until your PDF arrives."); }
    // Public landing-page starts always show the introduction, retaining saved answers.
    const entryUrl = new URL(window.location.href);
    if (entryUrl.searchParams.get("entry") === "intro") {
      restored = { ...restored, step: "intro" };
      entryUrl.searchParams.delete("entry");
      window.history.replaceState(window.history.state, "", entryUrl.pathname + entryUrl.search + entryUrl.hash);
    }
    setSaved(restored);
    try { const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "null"); const current = locationOf(restored); setNavigation(history && isLocation(history.current) && sameLocation(history.current, current) && Array.isArray(history.past) && history.past.every(isLocation) && Array.isArray(history.future) && history.future.every(isLocation) ? history : { past: [], current, future: [] }); }
    catch { setNavigation({ past: [], current: locationOf(restored), future: [] }); }
    previousSaved.current = restored;
    setLoaded(true);
  }, []);
  useEffect(() => { if (loaded) { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch { setError("This browser could not save your progress. Please keep the page open until your PDF arrives."); } } }, [saved, loaded]);
  useEffect(() => { if (loaded) { try { localStorage.setItem(HISTORY_KEY, JSON.stringify(navigation)); } catch { /* Review progress still saves independently. */ } } }, [navigation, loaded]);
  useEffect(() => {
    if (!loaded) return;
    const previous = previousSaved.current;
    previousSaved.current = saved;
    if (isTransient(saved.step)) return;
    const location = locationOf(saved);
    setNavigation(history => {
      if (!sameLocation(history.current, location)) return { past: [...history.past, history.current].slice(-100), current: location, future: [] };
      const dataChanged = previous && sameLocation(locationOf(previous), location) && (Object.keys(saved) as (keyof Saved)[]).some(key => key !== "step" && key !== "criterion" && key !== "reportView" && saved[key] !== previous[key]);
      return dataChanged && history.future.length ? { ...history, future: [] } : history;
    });
  }, [saved, loaded]);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [saved.step, saved.criterion, saved.reportView]);
  useEffect(() => { if (busy !== "tar" || quickFinishing) return; const index = progressClock % quickMessages.length; quickMessageIndex.current = index; quickMessageShownAt.current = performance.now(); const timer = window.setTimeout(() => setProgressClock(value => value + 1), quickMessageDuration(quickMessages[index])); return () => window.clearTimeout(timer); }, [busy, progressClock, quickFinishing]);
  useEffect(() => { if (busy !== "email") return; setProgressClock(0); const timer = window.setInterval(() => setProgressClock(value => value + 1), 3800); return () => window.clearInterval(timer); }, [busy]);
  useEffect(() => { if (!milestone) return; const timer = window.setTimeout(() => setMilestone(""), 1800); return () => window.clearTimeout(timer); }, [milestone]);
  useEffect(() => {
    if (saved.step !== "done") { emailAttempt.current = null; return; }
    if (!loaded || !saved.report || !saved.email || saved.emailSent) return;
    const receiptKey = `msi-review-email:${saved.sessionId}:${saved.email.trim().toLowerCase()}`;
    if (emailAttempt.current === receiptKey) return;
    emailAttempt.current = receiptKey;
    void sendFinalReport(receiptKey);
  }, [loaded, saved.step, saved.sessionId, saved.email, saved.emailSent]);
  function event(type: string, extra = {}) { void trackSorpEvent(saved.sessionId, type, { organisation: saved.candidate?.name, readinessScore: saved.report?.tar.score ?? undefined, ...extra }, false); }
  async function saveFeedback(phase: "quick" | "final", rating: number, comment: string) {
    if (!rating && !comment.trim()) return;
    setFeedbackStatus(current => ({ ...current, [phase]: "saving" }));
    try { await post("/api/published-review", { operation: "feedback", sessionId: saved.sessionId, organisation: saved.candidate?.name, rating, comment, phase }); setFeedbackStatus(current => ({ ...current, [phase]: "saved" })); event(phase === "quick" ? "quick_review_feedback_submitted" : "full_review_feedback_submitted", { rating }); }
    catch { setFeedbackStatus(current => ({ ...current, [phase]: "error" })); }
  }
  function go(step: Step) { setError(""); setSaved(current => ({ ...current, step })); }
  const report = saved.report;
  const homeworkComplete = !!saved.state && verifiedTar(saved.verifiedTar);
  const tar = report?.tar;
  const { strong, gaps, priorities: originalPriorities } = tar ? highlights(tar) : { strong: [], gaps: [], priorities: [] };
  const priorityText = (finding: Finding) => finding.action === "Check the source and establish what can be evidenced for the next report."
    ? `Check what the next Trustees’ Annual Report can evidence for criterion ${finding.fieldId}: ${coreQuestions.find(question => question.id === finding.fieldId)?.question || finding.finding}`
    : finding.action;
  const priorities = originalPriorities.map(finding => ({ ...finding, action: priorityText(finding) }));
  const questions = coreQuestions.map(question => {
    const existing = tar?.findings.find(finding => finding.fieldId === question.id);
    // Preserve the service's score. A missing item remains explicitly unestablished,
    // never silently inferred from website or impact-report evidence.
    const fallback: Finding = { fieldId: question.id, answer: "not_sure", confidence: "LOW", finding: question.question, reason: "Not established from the statutory material inspected.", excerpt: "", page: "", sourceUrl: tar?.sourceUrl || "", action: "Check the relevant reporting and evidence before the next Trustees’ Annual Report.", requirement: question.explanation, classification: question.classification.tier1, sources: question.sources.map(reference => ({ reference, page: 0, text: question.explanation })) };
    return { question, finding: existing || fallback, returned: Boolean(existing) };
  });
  const current = questions[saved.criterion];
  const correction = current ? saved.corrections[String(current.question.id)] : undefined;
  const phase = phaseFor(saved.step);
  const setup = (saved.state as { setup?: AssessmentSetup } | null)?.setup;
  const reportingTier = setup ? tierLabel(setup) : "Not yet confirmed";
  const reviewedCount = questions.filter(({ question }) => saved.corrections[String(question.id)]?.reviewed).length;
  const currentAnswers = questions.map(({ question, finding }) => saved.corrections[String(question.id)]?.answer || finding.answer);
  const currentScore = reviewedCount === 15 && currentAnswers.filter(answer => answer !== "not_sure").length >= 5
    ? Math.round(currentAnswers.reduce((total, answer) => total + weights[answer], 0) / (15 * 4) * 100) : null;
  const scoreDifference = currentScore !== null && tar?.score !== null && tar?.score !== undefined ? currentScore - tar.score : null;
  const changedAnswers = questions.filter(({ question, finding }) => { const answer = saved.corrections[String(question.id)]?.answer; return Boolean(answer && answer !== finding.answer); });
  const savedComments = questions.filter(({ question }) => Boolean(saved.corrections[String(question.id)]?.savedContext?.trim()));
  async function revealSteps(items: string[]) {
    setGeneration([]);
    for (const item of items) { await pause(125); setGeneration(previous => [...previous, item]); }
  }

  async function find(e?: React.FormEvent) {
    e?.preventDefault(); if (!saved.query.trim() || busy || saved.research) return;
    setSaved(state => ({ ...state, candidate: null, state: null }));
    setBusy("find"); setError(""); event("assessment_started");
    try {
      const data = await post("/api/published-review", { operation: "find", query: saved.query, sessionId: saved.sessionId, intelligencePin: saved.intelligence });
      setSaved(state => ({ ...state, research: data.research, intelligence: data.intelligence, candidate: null, state: null, verifiedTar: null, report: null, emailSent: false, corrections: {} }));
      event("organisation_found");
      if (data.research.candidates.length === 1) {
        setBusy("");
        setSaved(state => ({ ...state, candidate: data.research.candidates[0] }));
        await pause(700);
        setSaved(state => ({ ...state, step: "confirmation" }));
      }
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : "We could not search just now."); }
    finally { setBusy(""); }
  }
  function confirmCandidate(candidate: Candidate) {
    setSaved(state => ({ ...state, candidate, state: null, verifiedTar: null, step: "confirmation" }));
  }
  async function startHomework() {
    if (!saved.candidate || busy) return;
    if (verifiedTar(saved.verifiedTar)) { go("homework"); return; }
    const candidate = saved.candidate;
    go("homework");
    setHomeworkReveal(0);
    setBusy("profile"); setError("");
    try {
      const data = saved.state && saved.intelligence ? { candidate, state: saved.state, intelligence: saved.intelligence } : await post("/api/published-review", { operation: "profile", candidate, sessionId: saved.sessionId, intelligencePin: saved.intelligence });
      setSaved(state => ({ ...state, candidate: data.candidate, state: data.state, intelligence: data.intelligence, verifiedTar: null }));
      if (data.candidate.entityType !== "registered_charity") { go("non-sorp"); return; }
      const reviewed = await post("/api/published-review", { operation: "tar", candidate: data.candidate, state: data.state, sessionId: saved.sessionId, intelligencePin: data.intelligence });
      if (!verifiedTar(reviewed.lens as Lens)) throw new Error("The Trustees’ Annual Report was not fully read. We cannot give a score yet.");
      setSaved(state => ({ ...state, verifiedTar: reviewed.lens as Lens }));
      for (let index = 1; index <= 8; index++) { await pause(100); setHomeworkReveal(index); }
    } catch (cause) { if ((cause as { recovery?: string })?.recovery === "upload-report") go("tar-recovery"); else setError(cause instanceof Error ? cause.message : "We could not read the Trustees’ Annual Report yet."); }
    finally { setBusy(""); }
  }
  async function finishQuickReview(lens: Lens, started: number) {
    if (!verifiedTar(lens)) throw new Error("The Trustees’ Annual Report was not fully read. We cannot give a score yet.");
    const next: Report = { candidate: saved.candidate!, tar: lens, wider: emptyLens("wider", "Wider evidence was deliberately not assessed in this published-reporting review."), createdAt: new Date().toISOString(), intelligence: saved.intelligence! };
    setQuickFinishing(true); setGenerationReady(true);
    await revealSteps(quickSteps);
    await pause(Math.max(0, 6500 - (performance.now() - started), quickMessageDuration(quickMessages[quickMessageIndex.current]) - (performance.now() - quickMessageShownAt.current)));
    setSaved(state => ({ ...state, report: next, email: state.email.trim(), step: saved.candidate?.entityType === "registered_charity" ? "quick-ready" : "non-sorp" }));
    event("public_research_completed", { readinessScore: lens.score ?? undefined, evidenceConfidence: lens.confidence }); event("quick_review_reached"); event("tar_score", { readinessScore: lens.score ?? undefined });
  }
  async function review(e?: React.FormEvent) {
    e?.preventDefault(); if (!saved.candidate || !saved.email.trim() || !saved.intelligence || busy) return;
    if (!verifiedTar(saved.verifiedTar)) { setError("The Trustees’ Annual Report must be fully read first."); return; }
    if (saved.email.trim().toLowerCase() !== saved.emailConfirm.trim().toLowerCase()) { setEmailMismatch(true); return; }
    setEmailMismatch(false);
    const started = performance.now();
    setBusy("tar"); setError(""); setProgressClock(0); setQuickFinishing(false); setGenerationReady(false); setGeneration([]); go("quick-generating"); event("email_captured");
    try {
      await finishQuickReview(saved.verifiedTar, started);
    } catch (cause) { setSaved(state => ({ ...state, step: (cause as { recovery?: string })?.recovery === "upload-report" ? "tar-recovery" : "homework" })); setError((cause as { recovery?: string })?.recovery === "upload-report" ? "" : cause instanceof Error ? cause.message : "The statutory review could not finish. Please retry."); }
    finally { setBusy(""); setGenerationReady(false); }
  }
  async function uploadTar(file?: File) {
    if (!file || !saved.candidate || !saved.intelligence || busy) return;
    const payload = new FormData();
    payload.set("payload", JSON.stringify({ operation: "tar", candidate: saved.candidate, state: saved.state, sessionId: saved.sessionId, intelligencePin: saved.intelligence }));
    payload.set("report", file);
    setBusy("profile"); setError(""); go("homework");
    try { const data = await post("/api/published-review", payload); if (!verifiedTar(data.lens as Lens)) throw new Error("The uploaded report was not fully read."); setSaved(state => ({ ...state, verifiedTar: data.lens as Lens, step: "homework" })); }
    catch (cause) { setSaved(state => ({ ...state, step: "tar-recovery" })); setError(cause instanceof Error ? cause.message : "This copy could not be read. Please choose a readable PDF."); }
    finally { setBusy(""); setGenerationReady(false); }
  }
  function updateCorrection(patch: Partial<Correction>) {
    if (!current) return; const id = String(current.question.id);
    setSaved(state => ({ ...state, corrections: { ...state.corrections, [id]: { ...(state.corrections[id] || { context: "", reviewed: false }), ...patch } } }));
  }
  function nextCriterion() {
    if (!current) return;
    const id = String(current.question.id);
    const wasReviewed = saved.corrections[id]?.reviewed;
    setSaved(state => ({ ...state, corrections: { ...state.corrections, [id]: { ...(state.corrections[id] || { context: "" }), reviewed: true } }, criterion: state.criterion + 1 < 15 ? state.criterion + 1 : state.criterion, step: state.criterion + 1 < 15 ? "criterion" : "complete" }));
    if (!wasReviewed) event("guided_prompt_completed", { currentStage: saved.criterion + 1 });
    if ([4, 9].includes(saved.criterion)) setMilestone(saved.criterion === 4 ? "5 OF 15 COMPLETE ✓  Good progress. You’re one third of the way through." : saved.criterion === 9 ? "10 OF 15 COMPLETE ✓  Nearly there. Five to go." : "15 OF 15 COMPLETE ✓");
    if (saved.criterion === 14) event("guided_conversation_completed");
  }
  function resultWithContext(value: Report) {
    const result = emailResult(value);
    const notes = questions.flatMap(({ question, finding }) => {
      const user = saved.corrections[String(question.id)];
      if (!user?.answer && !user?.savedContext?.trim()) return [];
      return [`Criterion ${question.id}: MSI published-evidence assessment was ${scale.find(item => item.value === finding.answer)?.label || finding.answer}. ${user.answer ? `User correction: ${scale.find(item => item.value === user.answer)?.label || user.answer}.` : ""} ${user.savedContext?.trim() ? `User context: ${user.savedContext.trim()}` : ""} User-supplied, not independently verified and not used to change the TAR-only score.`];
    });
    return { ...result, priorities: priorities.map(priorityText), must: value.tar.findings.filter(finding => finding.classification === "MUST" && finding.answer !== "yes").map(priorityText), userConfirmedPractice: notes,
      publishedEvidence: { ...result.publishedEvidence, traceability: [...result.publishedEvidence.traceability, ...notes.map((note, index) => ({ title: `User-supplied context ${index + 1}: not used in the published-evidence score`, detail: note }))] },
      overview: `${result.overview} ${currentScore === null ? "There were not enough reviewed current answers to calculate a separate current-view score." : `Current self-reported view: ${currentScore}/100, based on the 15 answers the user reviewed; not independently verified. The original published-reporting score remains ${value.tar.score ?? "unavailable"}/100.`} ${notes.length ? "User corrections and context are separately labelled in this report; the published-reporting score remains unchanged." : "No user corrections were added."}` };
  }
  async function buildReport() {
    if (!report || busy || !saved.email) return;
    const started = performance.now();
    setBusy("email"); setError(""); setGeneration([]); setGenerationReady(false); go("generating"); event("full_report_generation_started");
    try {
      setGenerationReady(true);
      await revealSteps(reportSteps);
      await pause(Math.max(0, 12000 - (performance.now() - started)));
      setSaved(state => ({ ...state, step: "report-ready", reportView: 0 }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Report preparation failed. Please retry."); setSaved(state => ({ ...state, step: "complete" })); }
    finally { setBusy(""); setGenerationReady(false); }
  }
  async function sendFinalReport(receiptKey: string) {
    if (saved.step !== "done" || !report || !saved.email || saved.emailSent) return;
    const send = async () => {
      try {
        if (localStorage.getItem(receiptKey) === "sent") {
          setSaved(state => ({ ...state, emailSent: true }));
          return;
        }
        setEmailSending(true);
        setError("");
        const data = await post("/api/readiness/review-report-email", { deliveryStage: "done", sessionId: saved.sessionId, email: saved.email, name: saved.name, role: saved.role === "OTHER" ? saved.roleOther : saved.role, shareRequestWithMsi: true, organisation: saved.candidate?.name, result: resultWithContext(report), impactMode: false });
        if (!data.ok || !data.attachment?.endsWith(".pdf")) throw new Error("The full PDF was not confirmed as attached. Please retry.");
        // Persist the receipt before rendering success, including across tabs/history.
        localStorage.setItem(receiptKey, "sent");
        setSaved(state => ({ ...state, emailSent: true }));
        event("pdf_email_sent");
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Email failed. No success was confirmed."); }
      finally { setEmailSending(false); }
    };
    // The provider also deduplicates the unchanged report if a tab closes mid-send.
    if (navigator.locks) await navigator.locks.request(receiptKey, send);
    else await send();
  }
  async function contribute() {
    const amountMinor = supportPence(support, custom);
    if (!amountMinor || busy) return; setBusy("support"); setError(""); event("support_payment_started", { amountMinor, currency: "GBP", paymentType: "voluntary_support" });
    try { const data = await post("/api/sorp-payments/checkout", { paymentType: "voluntary_support", presentation: "embedded", band: null, amountMinor, sessionId: saved.sessionId, organisation: saved.candidate?.name, email: saved.email, idempotencyKey: `${saved.sessionId}:support:${amountMinor}:${crypto.randomUUID()}` }); if (data.presentation !== "embedded" || !data.clientSecret || !data.id) throw new Error("Inline payment could not be opened. No payment was taken."); setCheckout({ clientSecret: data.clientSecret, sessionId: data.id }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Inline payment could not open. No payment was taken."); }
    finally { setBusy(""); }
  }

  function back() {
    const previous = navigation.past.at(-1);
    if (!previous || busy) return;
    setCheckout(null); setError("");
    setNavigation(history => ({ past: history.past.slice(0, -1), current: previous, future: [history.current, ...history.future] }));
    setSaved(state => ({ ...state, ...previous }));
  }
  function forward() {
    const next = navigation.future[0];
    if (!next || busy) return;
    setCheckout(null); setError("");
    setNavigation(history => ({ past: [...history.past, history.current], current: next, future: history.future.slice(1) }));
    setSaved(state => ({ ...state, ...next }));
  }

  function guide() {
    if (saved.step === "benefits") return null;
    if (saved.step === "intro") return <div className="scr-intro-vision"><p className="scr-kicker">OUR VISION</p><h2>Imagine a world where social impact was taken as seriously as financial performance.</h2><div className="scr-vision-motion" aria-hidden="true"><svg viewBox="0 0 360 220" fill="none" focusable="false"><path className="scr-impact-grid" d="M12 44V192H148 M12 148H130 M12 104H130 M12 60H130 M48 44V192 M84 44V192 M120 44V192"/><path className="scr-impact-signal" d="M12 170H40V151H69V157H97V119H125V130L158 105"/><g className="scr-impact-network"><path d="M158 105L213 40L278 66L333 33 M158 105L241 111L328 151 M158 105L202 179L277 192L328 151 M213 40L241 111L202 179 M278 66L241 111L277 192 M278 66L328 151 M333 33L328 151"/></g><path className="scr-impact-flow" pathLength="100" d="M12 170H40V151H69V157H97V119H125V130L158 105L213 40L278 66L333 33"/><path className="scr-impact-flow scr-impact-flow--second" pathLength="100" d="M158 105L241 111L328 151L277 192L202 179L158 105"/>{[[158,105],[213,40],[278,66],[333,33],[241,111],[328,151],[202,179],[277,192]].map(([x,y],i)=><g key={x} className="scr-impact-point" style={{animationDelay:`${i * -.45}s`}}><circle className="scr-impact-aura" cx={x} cy={y} r={i===0?17:11}/><circle className="scr-impact-dot" cx={x} cy={y} r={i===0?5:3.5}/></g>)}</svg></div><p className="scr-intro-vision-context">We built Are You SORP Ready? because SORP 2026 raises the bar for impact reporting, and we want charities to use that requirement as an opportunity to improve impact throughout the year.</p></div>;
    if (saved.step === "find") return <><p className="scr-kicker">GOOD TO KNOW</p><h2>SORP 2026 HAS THREE REPORTING TIERS.</h2><div className="scr-tier-visual" role="group" aria-label="SORP 2026 reporting tiers"><div><span>TIER 1</span><strong>£500k or less</strong></div><div><span>TIER 2</span><strong>Over £500k to £15m</strong></div><div><span>TIER 3</span><strong>Over £15m</strong></div></div><p>Your tier affects which SORP reporting requirements apply.</p></>;
    if (saved.step === "confirmation") return <><p className="scr-kicker">IDENTITY CHECK</p><h2>Is this your charity?</h2><p>Check the legal name, charity number and official sources. The website is shown to confirm identity, not used in the published-report score.</p></>;
    if (saved.step === "homework") return <><p className="scr-kicker">WHAT HAPPENS NEXT</p><h2>A published starting point.</h2><p>We’ll assess the Trustees’ Annual Report and accounts against 15 areas mapped to SORP 2026. You’ll get a quick view before telling us where things stand today.</p></>;
    if (saved.step === "quick-generating" || saved.step === "quick-ready" || saved.step === "tar-recovery") return <><p className="scr-kicker">HOW THIS WORKS</p><h2>SORP 2026 IS OUR SOURCE OF TRUTH.</h2><p>We compare your latest published Trustees’ Annual Report and accounts against 15 areas mapped to SORP 2026.</p><p>My Social Impact’s methodology interprets the published evidence and applies a fixed scoring approach to give you a historical SORP-readiness starting point.</p><p>Next, you’ll tell us what has changed since then.</p></>;
    if (saved.step === "quick") return <div className="scr-quick-language"><p className="scr-kicker">THE LANGUAGE OF SORP</p><dl>{[["MUST", "Required to comply with the SORP."], ["SHOULD", "Good-practice recommendations that charities are encouraged to follow."], ["MAY", "Options or approaches a charity can choose where appropriate."]].map(([label, description]) => <div key={label}><dt className={`scr-quick-term--${label.toLowerCase()}`}>{label}</dt><dd>{description}</dd></div>)}</dl><p className="scr-quick-language-note">Some areas require judgement when applying the SORP to real evidence.</p><p>My Social Impact Intelligence assesses the published evidence against these requirements. You can inspect the SORP source behind each assessment in the next stage.</p></div>;
    if (saved.step === "quick-feedback") return <div className="scr-feedback-guide"><h2>HELP THE NEXT CHARITY</h2><div className="scr-feedback-visual" role="img" aria-label="Feedback passed forward to help the next charity"><svg viewBox="0 0 400 250" aria-hidden="true" focusable="false"><path className="scr-feedback-link" d="M97 124 C150 124 149 84 204 84 S260 124 307 124"/><circle className="scr-feedback-ripple scr-feedback-ripple--first" cx="95" cy="124" r="76"/><circle className="scr-feedback-ripple" cx="95" cy="124" r="50"/><circle className="scr-feedback-ripple scr-feedback-ripple--last" cx="307" cy="124" r="76"/><circle className="scr-feedback-ripple" cx="307" cy="124" r="50"/><circle className="scr-feedback-origin" cx="95" cy="124" r="13"/><circle className="scr-feedback-passing" cx="203" cy="84" r="7"/><circle className="scr-feedback-destination" cx="307" cy="124" r="13"/></svg></div><p>Your feedback helps us make this more useful for the next charity.</p></div>;
    if (saved.step === "final-feedback") return <><p className="scr-kicker">OPTIONAL FEEDBACK</p><h2>Help the next charity.</h2><p>A rating or comment helps us improve this free tool. You can continue without leaving feedback.</p></>;
    if (saved.step === "method") return <div className="scr-current-flow"><p className="scr-kicker">WHAT HAPPENS NEXT</p><ol><li><strong>QUICK REVIEW</strong><span>What we found historically</span></li><li><strong>YOUR CURRENT VIEW</strong><span>Your answers and comments today</span></li><li><strong>FULLER REPORT</strong><span>Strengths, gaps and priorities</span></li><li><strong>MY SOCIAL IMPACT</strong><span>Optional professional review</span></li></ol><p className="scr-current-flow-note">You add what the historic evidence cannot tell us.</p></div>;
    if (saved.step === "criterion") return <><p className="scr-kicker">YOUR PROGRESS</p><h2>{reviewedCount} of 15 reviewed.</h2><div className="scr-rail-meter"><span style={{ width: `${reviewedCount / 15 * 100}%` }} /></div><ol className="scr-rail-areas">{areaLabels.map((label, index) => <li key={label} className={index === saved.criterion ? "is-current" : index < saved.criterion || saved.corrections[String(index + 1)]?.reviewed ? "is-reviewed" : ""}><span>{saved.corrections[String(index + 1)]?.reviewed ? "✓" : index + 1}</span>{label}</li>)}</ol><p className="scr-guide-note">{saved.criterion < 5 ? "Good impact reporting starts with information you can use throughout the year." : saved.criterion < 10 ? "MUST is required. SHOULD is recommended. MAY is optional. MSI judgement is labelled separately." : "Better evidence supports better decisions, not just a stronger annual report."}</p></>;
    if (saved.step === "complete") return <><p className="scr-kicker">WHAT HAPPENS NOW</p><h2>From two views to priorities.</h2><p>We’ll compare the published starting point with your self-reported position, then include your saved comments as context for what comes next.</p></>;
    if (saved.step === "generating" || saved.step === "report-ready") return <><p className="scr-kicker">YOUR PERSONALISED REPORT</p><h2>Useful information, not just compliance.</h2><p>Better evidence helps trustees and managers make decisions during the year, not only write a report afterwards.</p></>;
    if (saved.step === "report") return saved.reportView === 0 ? <div className="scr-report-vision"><p className="scr-kicker">OUR VISION</p><h2>Imagine a world where social impact was taken as seriously as financial performance.</h2><p>That means reviewing impact regularly throughout the year, not just reporting it at year-end.</p><div className="scr-report-support"><h3>ONGOING SUPPORT</h3><p>My Social Impact can provide regular impact check-ins and act as an outsourced impact director where useful.</p></div></div> : <div className="scr-agenda-guide"><p className="scr-kicker">USE IT. DON’T JUST FILE IT.</p><ol className="scr-agenda-cycle"><li>REVIEW<span aria-hidden="true">↓</span></li><li>ACT<span aria-hidden="true">↓</span></li><li>REVISIT</li></ol><p className="scr-agenda-principle">Impact is something to manage throughout the year, not reconstruct at year-end.</p><div className="scr-agenda-hand"><h3>WANT A HAND?</h3><p>You can book a professional review with My Social Impact at the end of this process.</p></div></div>;
    if (saved.step === "email-ready") return <><p className="scr-kicker">KEEP YOUR REPORT</p><h2>Share it and use it.</h2><p>The PDF is yours to share with trustees or colleagues, use as an action plan, or bring to a conversation with My Social Impact.</p></>;
    if (saved.step === "support") return <><p className="scr-kicker">YOUR REPORT IS YOURS</p><h2>Optional support.</h2><p>No contribution is needed to receive your report. Supporting the free tool helps us offer it to more charities.</p></>;
    if (saved.step === "before-go") return <div className="scr-beyond"><p className="scr-kicker">BEYOND COMPLIANCE</p><svg className="scr-beyond-visual" viewBox="0 0 360 420" role="img" aria-label="SORP ready leads to better impact and Social Impact Excellence"><path className="scr-beyond-thread" d="M42 45 V135 Q42 165 72 165 H286 Q316 165 316 195 V250 Q316 280 286 280 H72 Q42 280 42 310 V366"/><circle className="scr-beyond-halo" cx="180" cy="335" r="74"/><circle className="scr-beyond-halo" cx="180" cy="335" r="58"/><circle className="scr-beyond-start" cx="42" cy="45" r="16"/><path className="scr-beyond-check" d="m35 45 5 5 9-10"/><text className="scr-beyond-label" x="74" y="50">SORP READY</text><path className="scr-beyond-arrow" d="m310 217 6 7 6-7"/><text className="scr-beyond-impact" x="42" y="122">Better impact.</text><text className="scr-beyond-label" x="42" y="144">BETTER IMPACT</text><path className="scr-beyond-arrow" d="m36 347 6 7 6-7"/><text className="scr-beyond-excellence" x="74" y="323"><tspan x="74">Social Impact</tspan><tspan x="74" dy="36">Excellence</tspan></text><path className="scr-beyond-rays" d="M272 302l14-10 M279 317l19-3 M278 334l17 5 M267 350l12 13 M252 359l5 16"/></svg><p className="scr-beyond-caption">Being SORP ready is the starting point. Better impact is the opportunity.</p></div>;
    if (saved.step === "help") return <><p className="scr-kicker">IMPACT THROUGHOUT THE YEAR</p><h2>Beyond the annual report.</h2><p>Useful evidence. Better decisions. Stronger impact.</p></>;
    if (saved.step === "next") return <div className="scr-report-vision"><p className="scr-kicker">OUR VISION</p><h2>Imagine a world where social impact was taken as seriously as financial performance.</h2></div>;
    if (saved.step === "done") return <><p className="scr-kicker">REVIEW COMPLETE</p><h2>Your report is ready to use.</h2><p>Return to it when planning your next Trustees’ Annual Report or discussing priorities with colleagues.</p></>;
    return <><p className="scr-kicker">THE RIGHT ENTITY</p><h2>Let’s check the charity record.</h2><p>A non-charity entity should not be assessed as if SORP applies to it.</p></>;
  }

  if (!loaded) return <main className="sorp-conversation-page scr-page"><p className="scr-loading">Opening your SORP review…</p></main>;
  return <main className={`sorp-conversation-page scr-page${saved.step === "benefits" ? " scr-page--benefits" : saved.step === "intro" ? " scr-page--intro" : saved.step === "find" ? " scr-page--find" : saved.step === "quick" ? " scr-page--quick" : saved.step === "quick-feedback" ? " scr-page--quick-feedback" : saved.step === "method" ? " scr-page--method" : saved.step === "help" ? " scr-page--help" : ""}`}>
    <header className="sorp-workspace-brand"><Link href="/are-you-sorp-ready"><span>My Social Impact</span><strong>Are You SORP Ready?</strong></Link><div className="sorp-workspace-brand-meta"><p>SORP is the requirement.<br /><strong>Better impact is the opportunity.</strong></p></div></header>
    <div className="scr-top">{saved.step !== "intro" && saved.step !== "find" && <div><small>{BUILD}</small><h2>{saved.step === "done" ? "You’re done" : phases[phase]}</h2></div>}<nav aria-label="Review progress">{phases.map((label, index) => <span key={label} className={saved.step === "done" || index < phase ? "is-complete" : index === phase ? "is-current" : ""}><i>{saved.step === "done" || index < phase ? "✓" : index + 1}</i><b>{label}</b></span>)}</nav></div>
    <div key={["intro", "benefits", "find"].includes(saved.step) ? saved.step : "assessment"} className={`scr-workspace${["intro", "benefits", "find"].includes(saved.step) ? " scr-opening-enter" : ""}`}><aside className="scr-guide">{guide()}</aside>
      <section className="scr-main" aria-live="polite">
        {saved.step === "benefits" && <div className="scr-benefits"><h1>WHAT YOU’LL GET</h1><div className="scr-benefits-journey"><svg className="scr-benefits-connection" viewBox="0 0 1000 220" preserveAspectRatio="none" aria-hidden="true"><path d="M60 58H195C280 58 260 114 350 114H525C610 114 590 170 680 170H920"/><path className="scr-benefits-traveller" pathLength="100" d="M60 58H195C280 58 260 114 350 114H525C610 114 590 170 680 170H920"/></svg><ol>{[
          ["YOUR SORP STARTING POINT", "A free review of your latest published Trustees’ Annual Report and accounts against SORP 2026.", "See how ready your published reporting appears."],
          ["YOUR CURRENT READINESS", "Update our assessment with what has changed and where things stand now.", "Add your own answers, comments and current knowledge."],
          ["A PROFESSIONAL REVIEW", "Get your personalised report and, if useful, talk the results through with My Social Impact.", "Use it as a starting point for improving SORP readiness and moving towards Social Impact Excellence."]
        ].map(([title, description, detail], index) => <li key={title}><span className="scr-benefit-number" aria-hidden="true">0{index + 1}</span><div><h2>{title}</h2><p>{description}</p><p className="scr-benefit-detail">{detail}</p></div></li>)}</ol></div><p className="scr-benefit-assurance">FREE REVIEW · PERSONALISED PDF · OPTIONAL PROFESSIONAL FOLLOW-UP</p></div>}
        {milestone && <div className="scr-milestone" role="status">{milestone}</div>}
        {saved.step === "intro" && <><p className="scr-kicker">SORP 2026 IS NOW IN EFFECT.</p><h1>ARE YOU SORP READY?</h1><p className="scr-lead">For relevant charities, SORP 2026 applies to reporting periods beginning on or after 1 January 2026.</p><div className="scr-philosophy">SORP IS THE REQUIREMENT.<br/><strong>BETTER IMPACT IS THE OPPORTUNITY.</strong></div><div className="scr-welcome-copy"><p>My Social Impact helps organisations understand, improve and communicate their impact, not just report it.</p><p>We created Social Impact Excellence to help organisations strengthen Purpose, Leadership, Data, Delivery and Communication.</p><p>We created the Social Impact Claims Code to support credible, evidence-based impact communication.</p><p>Are You SORP Ready? is our latest free tool, designed specifically to help charities prepare for SORP 2026.</p></div></>}
        {saved.step === "find" && <><p className="scr-kicker">01 / FIND YOUR CHARITY</p><h1>LET’S GET STARTED.</h1><p>Enter the registered charity name or charity number. We’ll confirm we’ve found the right organisation before reviewing anything.</p><form id="scr-find-form" onSubmit={find} className="scr-find"><label htmlFor="scr-query">Charity name or number</label><input id="scr-query" value={saved.query} onChange={e => setSaved(state => ({ ...state, query: e.target.value, research: null, candidate: null, state: null }))} placeholder="e.g. Interim Spaces or 1165694"/></form>{busy && <div className="scr-search-progress" role="status"><h2>FINDING YOUR CHARITY…</h2><EvidenceChecklist candidate={saved.candidate} research={saved.research} tier={reportingTier} busy phase="identity" /></div>}{saved.candidate && saved.research && !busy && <div className="scr-search-progress" role="status"><h2>WE FOUND A MATCH ✓</h2><EvidenceChecklist candidate={saved.candidate} research={saved.research} tier={reportingTier} busy={false} phase="identity" /></div>}{saved.research && !saved.candidate && !busy && <div className="scr-results"><h2>{saved.research.candidates.length ? "Choose the right registered organisation" : "We need one more clue."}</h2>{saved.research.candidates.map(candidate => <article key={`${candidate.registrationNumber}-${candidate.name}`}><div><strong>{candidate.name}</strong><p>{candidate.locality} · {candidate.registrationNumber || candidate.entityType}</p></div><button type="button" onClick={() => confirmCandidate(candidate)}>VIEW THIS CHARITY →</button></article>)}{!saved.research.candidates.length && <p>Try the registered name, charity number or a location.</p>}</div>}</>}
        {saved.step === "confirmation" && saved.candidate && <><p className="scr-kicker">WE FOUND YOU ✓</p><h1>{saved.candidate.name}</h1><div className="scr-fact"><span>Charity number</span><strong>{saved.candidate.registrationNumber || "Not established"}</strong></div><div className="scr-fact"><span>Charity Commission record</span><strong>{safeLink(saved.candidate.officialUrl) ? <a href={saved.candidate.officialUrl} target="_blank" rel="noreferrer">VIEW OFFICIAL RECORD ↗</a> : "Not available"}</strong></div><div className="scr-fact"><span>Official website</span><strong>{safeLink(saved.candidate.website) ? <a href={saved.candidate.website} target="_blank" rel="noreferrer">VIEW WEBSITE ↗</a> : "Not found"}</strong></div>{saved.candidate.locality && <div className="scr-fact"><span>Location</span><strong>{saved.candidate.locality}</strong></div>}<p className="scr-muted">Check the details below to confirm we’ve found the right charity.</p></>}
        {saved.step === "homework" && <><p className="scr-kicker">{homeworkComplete && !busy ? "PUBLIC HOMEWORK COMPLETE ✓" : "DOING THE PUBLIC HOMEWORK…"}</p><h1>{homeworkComplete && !busy ? "We found what we need." : "Checking the public record."}</h1><EvidenceChecklist candidate={saved.state ? saved.candidate : null} research={saved.research} tier={saved.state ? reportingTier : "Not yet confirmed"} busy={!!busy} phase="homework" visible={homeworkReveal} />{homeworkComplete && <><p className="scr-lead">{saved.candidate?.entityType === "registered_charity" ? "SORP 2026 applies to this charity for relevant future reporting periods." : "We need to confirm this entity’s charity status before assessing SORP."}</p><div className="scr-fact"><span>Latest published accounts / TAR</span><strong>{safeLink(saved.verifiedTar?.sourceUrl || saved.candidate?.reportUrl || "") ? <a href={saved.verifiedTar?.sourceUrl || saved.candidate?.reportUrl} target="_blank" rel="noreferrer">{saved.candidate?.reportTitle || "VIEW PUBLISHED REPORT"} ↗</a> : "Not established"}</strong></div><div className="scr-fact"><span>Reporting period</span><strong>{saved.candidate?.reportPeriod || "Not established"}</strong></div><div className="scr-fact"><span>Accounting basis</span><strong>{saved.candidate?.accountingBasis === "unknown" ? "Not established" : saved.candidate?.accountingBasis === "accruals" ? `${["HIGH", "ESTABLISHED"].includes(saved.candidate.accountingBasisConfidence?.toUpperCase()) ? "" : "Likely "}accruals accounts${["HIGH", "ESTABLISHED"].includes(saved.candidate.accountingBasisConfidence?.toUpperCase()) ? "" : " — not yet verified"}` : saved.candidate?.accountingBasis === "receipts" ? `${["HIGH", "ESTABLISHED"].includes(saved.candidate.accountingBasisConfidence?.toUpperCase()) ? "" : "Likely "}receipts and payments${["HIGH", "ESTABLISHED"].includes(saved.candidate.accountingBasisConfidence?.toUpperCase()) ? "" : " — not yet verified"}` : "Not established"}</strong></div><div className="scr-fact"><span>Published gross income</span><strong>{saved.candidate?.latestIncome == null ? "Not established" : new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(saved.candidate.latestIncome)}</strong></div><div className="scr-tier"><small>SORP 2026 REPORTING TIER</small><strong>{reportingTier}</strong><p>{reportingTier === "Not yet confirmed" ? "The current record does not establish a tier." : `The latest published income places ${saved.candidate?.name} in ${reportingTier}. That determines which SORP requirements apply.`}</p></div><p>This Quick Review will assess your latest published Trustees’ Annual Report and accounts.</p><h2>Where should we send your personalised report?</h2><p>Please enter your email twice so the PDF reaches the right address.</p><form id="scr-email-form" onSubmit={review} className="scr-fields"><label className={emailMismatch ? "is-invalid" : ""}>Email (required)<input required type="email" value={saved.email} onChange={e => { setEmailMismatch(false); setSaved(state => ({ ...state, email: e.target.value })); }} /></label><label className={emailMismatch ? "is-invalid" : ""}>Confirm email (required)<input required type="email" value={saved.emailConfirm} onChange={e => { setEmailMismatch(false); setSaved(state => ({ ...state, emailConfirm: e.target.value })); }} /></label>{emailMismatch && <p className="scr-field-error" role="alert">Those email addresses don’t match. Please check them before continuing.</p>}<label>Name (optional)<input value={saved.name} onChange={e => setSaved(state => ({ ...state, name: e.target.value }))} /></label><label>Role (optional)<select value={saved.role} onChange={e => setSaved(state => ({ ...state, role: e.target.value }))}><option value="">Choose a role</option>{roles.map(role => <option key={role} value={role}>{role}</option>)}</select></label>{saved.role === "OTHER" && <label>Describe your role<input value={saved.roleOther} onChange={e => setSaved(state => ({ ...state, roleOther: e.target.value }))}/></label>}</form></>}</>}
        {saved.step === "quick-generating" && <><p className="scr-kicker">BUILDING YOUR QUICK REVIEW…</p><h1>Reading what your report shows.</h1><div className="scr-progress-message scr-quick-message" role="status">{quickMessages.map(message => <span className="scr-message-size" aria-hidden="true" key={message}>{message}</span>)}<span>{quickMessages[progressClock % quickMessages.length]}</span></div><ProgressSequence items={quickSteps} complete={generation.length} active={generationReady ? Math.min(generation.length, quickSteps.length - 1) : 0}/><p className="scr-muted">Completed checks are marked when the assessment returns.</p></>}
        {saved.step === "quick-ready" && <div className="scr-quick-ready"><h1>YOUR QUICK REVIEW IS READY <span>✓</span></h1><p>We’ve finished reviewing your published Trustees’ Annual Report and accounts against SORP 2026.</p><p>Your result gives you a published starting point before you tell us what has changed since the report.</p></div>}
        {saved.step === "quick" && tar && <QuickReviewResult lens={tar}/>}
        {saved.step === "quick-feedback" && <><h1>HOW’S THE EXPERIENCE SO FAR?</h1><FeedbackPanel quick rating={saved.quickRating} comment={saved.quickComment} status={feedbackStatus.quick} onRating={value => { setSaved(state => ({ ...state, quickRating: value })); void saveFeedback("quick", value, saved.quickComment); }} onComment={value => { setFeedbackStatus(current => ({ ...current, quick: "" })); setSaved(state => ({ ...state, quickComment: value })); }} onCommentBlur={() => void saveFeedback("quick", saved.quickRating, saved.quickComment)}/></>}
        {saved.step === "method" && <><h1>YOUR QUICK REVIEW WAS THE STARTING POINT.<br />NOW BRING IT UP TO DATE.</h1><div className="scr-method-intro"><p>We’ve already assessed 15 areas using your historic published evidence.</p><p>Now review each one and tell us what has changed, where you think things stand today, and anything important the old information does not show.</p><p>Your answers and comments will help us build a fuller report showing your current strengths, gaps and priorities.</p></div><div className="scr-method-comment"><h2>WHY ADD COMMENTS?</h2><p>Your comments make the report more useful internally and can also form the starting agenda if you choose to review the results with My Social Impact afterwards.</p></div><details className="scr-details scr-method-details"><summary>HOW DID WE ARRIVE AT THE QUICK REVIEW? <span>+</span></summary><div className="scr-method-flow"><div><b>01</b><strong>SORP 2026</strong><span>Our source of truth.</span></div><div><b>02</b><strong>15 assessment areas</strong><span>Mapped to relevant requirements and guidance.</span></div><div><b>03</b><strong>Your published evidence</strong><span>AI interprets what the TAR and accounts show.</span></div><div><b>04</b><strong>Fixed scoring method</strong><span>The score is calculated consistently from those assessments.</span></div></div><div className="scr-method-legend"><span>MUST</span><span>SHOULD</span><span>MAY</span><span>MSI / HUMAN JUDGEMENT</span></div><p>Each area lets you open the relevant SORP basis and published evidence. Your current view does not change the historical published score.</p></details></>}
        {saved.step === "criterion" && current && <><p className="scr-kicker">QUESTION {saved.criterion + 1} OF 15 · {classificationLabel(current.finding.classification)}</p><div className="scr-area-progress" aria-label={`${reviewedCount} of 15 areas reviewed`}>{areaLabels.map((label, index) => <span key={label} className={saved.corrections[String(index + 1)]?.reviewed ? "is-reviewed" : index === saved.criterion ? "is-current" : ""} />)}</div><h1>{current.question.question}</h1><p>Review our published-evidence answer and tell us where things stand now.</p><p className="scr-subhead">MSI PUBLISHED-EVIDENCE VIEW</p><strong className={`scr-assessment ${current.finding.answer === "not_sure" || current.finding.confidence === "LOW" ? "is-uncertain" : ""}`}>{scale.find(item => item.value === current.finding.answer)?.label}</strong><p className="scr-subhead">WHY WE SAID THIS</p><p>{current.finding.reason}</p><p className="scr-confidence">Evidence confidence: {current.finding.confidence}</p><details className="scr-details"><summary>SEE THE SORP BASIS <span>+</span></summary><FindingSource finding={current.finding} /></details><p className="scr-subhead">YOUR CURRENT VIEW</p><p className="scr-muted">Choose a different answer if something has changed. Your current view is kept separate from the published assessment.</p><div className="scr-answer-grid">{scale.map(option => { const selected = correction?.answer === option.value; const suggested = current.finding.answer === option.value; return <button type="button" key={option.value} aria-pressed={selected || suggested && !correction?.answer} onClick={() => updateCorrection({ answer: suggested ? undefined : option.value })} className={`${selected ? "is-selected" : ""} ${suggested ? "is-suggested" : ""} ${suggested && option.value === "not_sure" ? "is-uncertain" : ""}`}><span>{option.label}{suggested && <small>MSI VIEW</small>}{selected && <small>YOUR CURRENT VIEW</small>}</span><span>{selected ? "✓" : "→"}</span></button>; })}</div><label className="scr-context" htmlFor="scr-context">ADD A COMMENT<textarea id="scr-context" value={correction?.context || ""} onChange={e => updateCorrection({ context: e.target.value })} rows={3} maxLength={4000} placeholder="What has changed, or what should we know?" /></label><p className="scr-muted">Explain a different answer or note something you may want to discuss later. Saved comments appear in your report.</p><div className="scr-context-actions"><button type="button" className="scr-clear" disabled={!correction?.context?.trim() || correction.savedContext === correction.context} onClick={() => updateCorrection({ savedContext: correction?.context || "" })}>SAVE MY COMMENT</button>{correction?.context?.trim() && correction.savedContext === correction.context && <span role="status">✓ COMMENT SAVED</span>}</div>{(correction?.answer || correction?.savedContext) && <div className="scr-current-view"><p><b>MSI’s published-evidence view:</b> {scale.find(item => item.value === current.finding.answer)?.label}</p><p><b>Your current view:</b> {scale.find(item => item.value === (correction?.answer || current.finding.answer))?.label}</p>{correction?.savedContext && <p><b>Your saved comment:</b> {correction.savedContext}</p>}</div>}{correction?.answer && <button type="button" className="scr-clear" onClick={() => updateCorrection({ answer: undefined })}>KEEP MSI’S ORIGINAL ASSESSMENT</button>}</>}
        {saved.step === "complete" && <><p className="scr-kicker">15 OF 15 COMPLETE ✓</p><h1>Thank you. Your current view is in.</h1><p className="scr-lead">We now have two clearly labelled views:</p><div className="scr-confirmed"><p>✓ What your published reporting showed</p><p>✓ Where you say things stand now</p></div><p>We’ll compare them and bring your saved comments into your personalised report.</p><p className="scr-muted">Your current answers do not rewrite the historical published-report score.</p></>}
        {saved.step === "generating" && <><p className="scr-kicker">BUILDING YOUR PERSONALISED REPORT…</p><h1>Bringing your review together.</h1><div className="scr-progress-message" role="status">{reportMessages[progressClock % reportMessages.length]}</div><ProgressSequence items={reportSteps} complete={generation.length} active={generationReady ? Math.min(generation.length, reportSteps.length - 1) : 0}/></>}
        {saved.step === "report-ready" && <div className="scr-quick-ready"><h1>YOUR PERSONALISED REPORT IS READY <span>✓</span></h1><p>We’ve combined your Quick Review with the answers and comments you added about where things stand now.</p><p>You can now compare your published starting point with your current self-reported readiness and see what matters most next.</p></div>}
        {saved.step === "report" && report && <>
          <p className="scr-kicker">YOUR PERSONALISED REPORT · {saved.reportView + 1} OF 2</p>
          {saved.reportView === 0 && <>
            <h1>YOUR SORP READINESS NOW</h1>
            <p>Your Quick Review gave you a published starting point. This view adds the answers and comments you provided about where things stand today.</p>
            <div className="scr-score-comparison">
              <div><small>QUICK REVIEW STARTING POINT</small><strong>{tar?.score ?? "—"}<em>/100</em></strong><p>Based on historic published evidence assessed by My Social Impact Intelligence.</p></div>
              <span aria-hidden="true">VS</span>
              <div><small>CURRENT SELF-REPORTED READINESS</small><strong>{currentScore ?? "—"}<em>{currentScore === null ? "" : "/100"}</em></strong><p>Based on your structured answers and comments. Self-reported, not independently verified.</p></div>
            </div>
            {currentScore === null ? <p className="scr-muted">There are not enough reviewed current answers to calculate a meaningful second score. We will not invent one.</p> : <p className="scr-score-explanation">{scoreDifference === null ? "The published-reporting score was unavailable, so there is no numerical comparison." : scoreDifference > 0 ? "Your current view suggests that you have moved further towards SORP readiness since the published starting point. The next challenge is making sure future reporting can evidence that progress." : scoreDifference < 0 ? "Your current view is more cautious than the Quick Review starting point. That may highlight areas where practice has changed, where gaps are now clearer, or where more work is needed before the next reporting period." : "Your current view broadly confirms the Quick Review starting point. The value now lies in identifying the strongest areas, remaining gaps and priorities before the next reporting period."}</p>}
            {tar && <ReportHighlights lens={tar}/>}
            {changedAnswers.length > 0 && <><h2>What changed between the two views</h2><div className="scr-report-list">{changedAnswers.map(({ question, finding }) => <p key={question.id}>{question.question}<br /><strong>{scale.find(item => item.value === finding.answer)?.label} → {scale.find(item => item.value === saved.corrections[String(question.id)]?.answer)?.label}</strong></p>)}</div></>}
            <details className="scr-details"><summary>SEE THE FULL 15-AREA ASSESSMENT <span>+</span></summary><div className="scr-report-list">{questions.map(({ question, finding }) => <details key={question.id}><summary><span>{String(question.id).padStart(2, "0")} · {question.question}</span><b>{scale.find(item => item.value === finding.answer)?.label}</b></summary><p>{finding.reason}</p><FindingSource finding={finding} /></details>)}</div></details>
          </>}
          {saved.reportView === 1 && <div className="scr-agenda">
            <h1>YOUR ACTION AGENDA</h1><p className="scr-lead">Use this with colleagues or trustees, or as the starting agenda for a review with My Social Impact.</p><h2 className="scr-agenda-label">TOP 3 PRIORITIES</h2><ol className="scr-agenda-priorities">{priorities.slice(0, 3).map((f, index) => { const copy = agendaCopy(f); return <li key={f.fieldId}><span className="scr-agenda-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><div><h3>{copy.title}</h3><p>{copy.reason}</p></div></li>; })}</ol>
            {savedComments.length > 0 && <><h2>Your comments and questions</h2><p>These are the issues you highlighted. Use them internally or as a starting agenda if you talk the results through with us.</p>{savedComments.map(({ question }) => <article className="scr-user-note" key={question.id}><h3>{question.id}. {question.question}</h3><p>{saved.corrections[String(question.id)].savedContext}</p></article>)}</>}
            <section className="scr-agenda-next"><h2>BEFORE YOUR NEXT REPORTING PERIOD</h2><p>Work through these priorities and keep evidence of what changes.</p><p>Impact should become part of normal management throughout the year, not something reconstructed at year-end.</p></section>
            <aside className="scr-agenda-review"><h2>WANT TO TALK THIS THROUGH?</h2><p>You’ll have the option at the end to book a professional review with My Social Impact.</p><p>We’ll already have your assessment, comments and priorities, so you won’t need to start from scratch.</p></aside>
          </div>}
        </>}
        {saved.step === "email-ready" && <><p className="scr-kicker">YOUR PERSONALISED REPORT IS READY ✓</p><h1>Your report is yours.</h1><div className="scr-email-celebration"><small>YOUR REPORT IS READY</small><span aria-hidden="true">✓</span></div><p>It includes your published starting point, current self-reported readiness, the 15 assessment areas, your comments, SORP sources and your priorities.</p><p>Share it with colleagues or trustees, use it as an internal action plan, or bring it to a conversation with My Social Impact.</p></>}
        {saved.step === "final-feedback" && <><p className="scr-kicker">OPTIONAL · A FEW SECONDS</p><h1>ONE LAST FAVOUR?</h1><p>If you gave us feedback earlier, thank you.</p><p>Now you’ve seen the full process, we’d love to know how the experience felt overall.</p><FeedbackPanel overall rating={saved.finalRating} comment={saved.finalComment} status={feedbackStatus.final} onRating={value => { setSaved(state => ({ ...state, finalRating: value })); void saveFeedback("final", value, saved.finalComment); }} onComment={value => { setFeedbackStatus(current => ({ ...current, final: "" })); setSaved(state => ({ ...state, finalComment: value })); }} onCommentBlur={() => void saveFeedback("final", saved.finalRating, saved.finalComment)}/></>}
        {saved.step === "support" && <><p className="scr-kicker">WHAT NEXT · OPTIONAL CONTRIBUTION</p><h1>ENJOYED THIS?<br/>HELP US KEEP IT FREE.</h1><p className="scr-lead">If this has been useful, a small contribution helps us keep building and running free tools like this, particularly for smaller charities.</p><p>Your report is already yours. This is completely optional.</p>{saved.supportPaid ? <p className="scr-mail">THANK YOU. THAT GENUINELY HELPS ✓</p> : checkout ? <><SorpPublicSupportCheckout clientSecret={checkout.clientSecret} sessionId={checkout.sessionId} onPaid={() => { setSaved(state => ({ ...state, supportPaid: true })); setCheckout(null); }}/><button type="button" className="scr-clear" onClick={() => setCheckout(null)}>CLOSE PAYMENT AND STAY HERE</button></> : <><div className="scr-amounts">{([5, 10, 20, "other"] as const).map(amount => <button key={amount} type="button" aria-pressed={support === amount} onClick={() => setSupport(amount)}>{amount === "other" ? "OTHER" : `£${amount}`}</button>)}</div>{support === "other" && <label className="scr-context">Amount in pounds<input inputMode="decimal" value={custom} onChange={e => setCustom(e.target.value)} /></label>}</>}</>}
        {saved.step === "before-go" && <div className="scr-ending-intro"><p className="scr-kicker">BEFORE WE SEND YOUR REPORT…</p><h1>CAN WE TELL YOU A LITTLE ABOUT US?</h1><p className="scr-lead">Your personalised report is ready and it’s yours.</p><p>Before we send it, we hope you don’t mind us taking two quick screens to introduce My Social Impact and show how we can help if you want to go further.</p><p className="scr-ending-promise">Then we’ll email your report to the address you gave us at the start.</p></div>}
        {saved.step === "next" && <><p className="scr-kicker">WHY MY SOCIAL IMPACT EXISTS</p><h1>Better impact is the opportunity.</h1><div className="scr-next-list">{[{title:"GET READY",text:"SORP readiness and stronger reporting."},{title:"GET BETTER",text:"Better evidence, Impact Reports, data and systems."},{title:"GET EXCELLENT",text:"Social Impact Excellence: Purpose · Leadership · Data · Delivery · Communication"},{title:"COMMUNICATE RESPONSIBLY",text:"Social Impact Claims Code: Evidence · Proportion · Transparency · Balance · Learning"}].map((item,index)=><article key={item.title}><small>{String(index+1).padStart(2,"0")}</small><div><h2>{item.title}</h2><p>{item.text}</p></div></article>)}</div></>}
        {saved.step === "help" && <SorpReviewBooking onSelect={() => event("book_conversation_clicked")} />}
        {saved.step === "done" && <div className="scr-ending-finish"><p className="scr-kicker">THANK YOU ✓</p><h1>YOUR REVIEW IS COMPLETE.</h1><div className="scr-email-celebration" role="status"><small>{saved.emailSent ? "YOUR REPORT HAS BEEN EMAILED ✓" : emailSending ? "SENDING YOUR PERSONALISED REPORT…" : "EMAIL DELIVERY IS NOT YET CONFIRMED"}</small>{saved.emailSent ? <p>We’ve sent your personalised SORP 2026 review to <strong>{saved.email}</strong>.</p> : <p>{emailSending ? "We’re sending the PDF to the address you gave us." : "Your report is available below. The email has not been confirmed."}</p>}<span aria-hidden="true">{saved.emailSent ? "✓" : "→"}</span></div>{!saved.emailSent && !emailSending && error && <button type="button" className="scr-email-retry" onClick={() => void sendFinalReport(`msi-review-email:${saved.sessionId}:${saved.email.trim().toLowerCase()}`)}>TRY SENDING MY REPORT AGAIN →</button>}<p>We hope it helps you get ready for SORP 2026 and, more importantly, strengthen the impact information you use throughout the year.</p><p>Share it with colleagues or trustees, use it as an action plan, or bring it to a conversation with My Social Impact.</p><div className="scr-done-links"><button type="button" onClick={() => setSaved(state => ({ ...state, step: "report", reportView: 0 }))}>VIEW MY REPORT →</button><button type="button" onClick={() => setSaved(state => ({ ...state, step: "help" }))}>BOOK A CONVERSATION →</button><a href="https://mysocialimpact.org/" target="_blank" rel="noreferrer">VISIT MY SOCIAL IMPACT →</a></div><section className="scr-done-note"><p className="scr-kicker">BUILT BY THE IDEAS SHED</p><p>Are You SORP Ready? was built by The Ideas Shed, where we create useful digital tools for organisations and the people who run them.</p><p>More tools are coming soon.</p></section><section className="scr-done-note"><p className="scr-kicker">COMING SOON</p><h2>SORP 2026 FOR ACCOUNTANTS</h2><p>We’re also developing a broader SORP 2026 tool for accountants and advisers, designed to support compliance across the full SORP rather than impact reporting alone.</p><p>If you would like to be an early beta user, or have ideas that would make the tool more useful, email Marcus at:</p><a href="mailto:marcus@mysocialimpact.org">marcus@mysocialimpact.org</a></section><footer className="scr-done-legal">My Social Impact is a trading name of The Ideas Shed Limited. Company No. 17380053. Registered in England and Wales.</footer></div>}
        {saved.step === "non-sorp" && <><p className="scr-kicker">LEGAL STATUS CHECK</p><h1>We need to pause this SORP review.</h1><p>The entity identified is not a registered charity. Please check the legal entity and charity number before we assess SORP applicability.</p></>}
        {saved.step === "tar-recovery" && <><p className="scr-kicker">REPORT READING PAUSED</p><h1>WE FOUND YOUR REPORT.<br/>WE NEED A READABLE COPY TO CONTINUE.</h1><p className="scr-lead">We need to read the Trustees’ Annual Report properly before we can give you a reliable score.</p><label className="scr-upload-report">UPLOAD THE REPORT →<input type="file" accept="application/pdf,.pdf" disabled={!!busy} onChange={event => { const file = event.target.files?.[0]; if (file) void uploadTar(file); }} /></label></>}
        {error && <div className="scr-error" role="alert">{error}</div>}
      </section></div>
    <footer className="scr-bottom">
      <div><button type="button" className="scr-back" disabled={!navigation.past.length || !!busy} onClick={back}>← BACK</button><button type="button" className="scr-forward" disabled={!navigation.future.length || !!busy} onClick={forward}>FORWARD →</button></div>
      <div>
        {saved.step === "intro" && <button onClick={() => go("benefits")}>SEE WHAT YOU’LL GET <span>→</span></button>}
        {saved.step === "benefits" && <button onClick={() => go("find")}>LET’S GET STARTED <span>→</span></button>}
        {saved.step === "find" && <button type="submit" form="scr-find-form" disabled={!!busy || !saved.query.trim() || !!saved.research}>FIND MY CHARITY <span>→</span></button>}
        {saved.step === "confirmation" && <><button type="button" className="is-secondary" onClick={() => setSaved(state => ({ ...state, step: "find", research: null }))}>NOT MY CHARITY — TRY AGAIN</button><button onClick={() => void startHomework()}>YES, THIS IS MY CHARITY <span>→</span></button></>}
        {saved.step === "homework" && (saved.report && verifiedTar(saved.report.tar) ? <button onClick={() => go("quick")}>RETURN TO QUICK REVIEW <span>→</span></button> : !homeworkComplete ? busy ? <span className="scr-bottom-status">Checking the public evidence…</span> : <button onClick={() => void startHomework()}>RETRY PUBLIC HOMEWORK <span>→</span></button> : <button type="submit" form="scr-email-form" disabled={!!busy || !saved.email.trim()}>BUILD MY QUICK REVIEW <span>→</span></button>)}
        {saved.step === "quick-generating" && <span className="scr-bottom-status">Building your Quick Review…</span>}
        {saved.step === "tar-recovery" && <span className="scr-bottom-status">Your progress is saved. Upload a readable PDF to continue.</span>}
        {saved.step === "quick-ready" && <button onClick={() => go("quick")}>VIEW MY QUICK REVIEW <span>→</span></button>}
        {saved.step === "quick" && <button onClick={() => { go("quick-feedback"); event("snapshot_viewed"); }}>CONTINUE <span>→</span></button>}
        {saved.step === "quick-feedback" && <button onClick={() => go("method")}>SEE WHERE WE ARE NOW <span>→</span></button>}
        {saved.step === "method" && <button onClick={() => { go("criterion"); event("guided_conversation_started"); }}>START MY CURRENT READINESS REVIEW <span>→</span></button>}
        {saved.step === "criterion" && <button onClick={nextCriterion}>{saved.criterion === 14 ? "COMPLETE MY CURRENT READINESS" : `GO TO QUESTION ${saved.criterion + 2} OF 15`}<span>→</span></button>}
        {saved.step === "complete" && (saved.emailSent ? <button onClick={() => go("report")}>RETURN TO MY REPORT <span>→</span></button> : <button onClick={() => void buildReport()} disabled={!!busy}>BUILD MY PERSONALISED REPORT <span>→</span></button>)}
        {saved.step === "generating" && <span className="scr-bottom-status">Preparing your personalised report…</span>}
        {saved.step === "report-ready" && <button onClick={() => { go("report"); event("full_report_viewed"); }}>VIEW MY PERSONALISED REPORT<span>→</span></button>}
        {saved.step === "report" && <button onClick={() => { if (saved.reportView === 0) setSaved(state => ({ ...state, reportView: 1 })); else go("final-feedback"); }}>{saved.reportView === 0 ? "SEE MY PRIORITIES" : "FINISH MY REVIEW"}<span>→</span></button>}
        {saved.step === "email-ready" && <button onClick={() => go("final-feedback")}>CONTINUE <span>→</span></button>}
        {saved.step === "final-feedback" && <button onClick={() => { go("support"); event("support_ask_viewed"); }}>CONTINUE <span>→</span></button>}
        {saved.step === "support" && (saved.supportPaid ? <button onClick={() => go("before-go")}>SEE WHAT COMES NEXT <span>→</span></button> : <><button className="is-secondary" onClick={() => { setCheckout(null); go("before-go"); }}>NOT NOW <span>→</span></button>{!checkout && <button disabled={!!busy || !supportPence(support, custom)} onClick={() => void contribute()}>{busy === "support" ? "OPENING PAYMENT…" : "CONTRIBUTE"}<span>→</span></button>}</>)}
        {saved.step === "next" && <button className="is-secondary" onClick={() => go("done")}>SKIP TO FINISH <span>→</span></button>}
        {saved.step === "help" && <div className="scr-booking-actions">
          {[["10 MIN — FREE", "BOOK FREE CALL"], ["30 MIN — £50", "BOOK £50 REVIEW"], ["60 MIN — £100", "BOOK £100 REVIEW"]].map(([label, action], index) => <button type="button" className="scr-booking-choice" key={label} onClick={() => document.querySelectorAll<HTMLButtonElement>(".sorp-meetings-options .sorp-meeting-book")[index]?.click()}><small>{label}</small><strong>{action} →</strong></button>)}
          <button type="button" className="is-secondary scr-booking-skip" onClick={() => go("done")}>SKIP TO FINISH →</button>
        </div>}
        {saved.step === "before-go" && <button onClick={() => go("next")}>YES — TELL ME A LITTLE MORE <span>→</span></button>}
        {saved.step === "next" && <button onClick={() => go("help")}>HOW CAN YOU HELP US? <span>→</span></button>}
        {saved.step === "non-sorp" && <button onClick={() => go("find")}>SEARCH ANOTHER CHARITY <span>→</span></button>}
      </div>
    </footer>
  </main>;
}
