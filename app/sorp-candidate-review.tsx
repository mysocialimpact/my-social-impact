"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { coreQuestions, answerOptions, tierLabel, type AnswerValue, type AssessmentSetup } from "./sorp-questionnaire";
import { trackSorpEvent } from "./sorp-growth";
import { supportPence, type SupportChoice } from "./sorp-payment-amounts";
import { SorpPublicSupportCheckout } from "./sorp-public-support-checkout";
import { band, classificationLabel, emailResult, emptyLens, highlights, weights, type Candidate, type Finding, type Intelligence, type Lens, type Report, type Research } from "./sorp-public-model";
import "./sorp-candidate-review.css";

type Step = "intro" | "find" | "confirmation" | "homework" | "quick-generating" | "quick" | "quick-feedback" | "method" | "criterion" | "complete" | "generating" | "report" | "email-ready" | "final-feedback" | "support" | "next" | "done" | "non-sorp";
type Correction = { answer?: AnswerValue; context: string; savedContext?: string; reviewed: boolean };
type Saved = { sessionId: string; step: Step; query: string; research: Research | null; candidate: Candidate | null; state: unknown; intelligence: Intelligence | null; report: Report | null; email: string; emailConfirm: string; name: string; role: string; roleOther: string; criterion: number; corrections: Record<string, Correction>; reportView: number; emailSent: boolean; supportPaid: boolean; quickRating: number; quickComment: string; finalRating: number; finalComment: string };
type ReviewLocation = Pick<Saved, "step" | "criterion" | "reportView">;
type ReviewHistory = { past: ReviewLocation[]; current: ReviewLocation; future: ReviewLocation[] };
const KEY = "msi-sorp-final-candidate-v1";
const HISTORY_KEY = `${KEY}-history`;
const BUILD = "27 SEPTEMBER 2026";
const SORP_SOURCE = "https://www.charitysorp.org/documents/d/guest/charities-sorp-2026-1";
const initial: Saved = { sessionId: "", step: "intro", query: "", research: null, candidate: null, state: null, intelligence: null, report: null, email: "", emailConfirm: "", name: "", role: "", roleOther: "", criterion: 0, corrections: {}, reportView: 0, emailSent: false, supportPaid: false, quickRating: 0, quickComment: "", finalRating: 0, finalComment: "" };
const locationOf = ({ step, criterion, reportView }: Saved): ReviewLocation => ({ step, criterion, reportView });
const sameLocation = (left: ReviewLocation, right: ReviewLocation) => left.step === right.step && left.criterion === right.criterion && left.reportView === right.reportView;
const isLocation = (value: unknown): value is ReviewLocation => Boolean(value && typeof value === "object" && typeof (value as ReviewLocation).step === "string" && Number.isInteger((value as ReviewLocation).criterion) && Number.isInteger((value as ReviewLocation).reportView));
const isTransient = (step: Step) => step === "quick-generating" || step === "generating";
const phases = ["Find charity", "Public homework", "Quick review", "Current readiness", "Your report", "What next"];
const scale = answerOptions.map(({ value, label }) => ({ value, label: label.toUpperCase() }));
const phaseFor = (step: Step) => step === "intro" || step === "find" || step === "confirmation" ? 0 : step === "homework" ? 1 : step === "quick-generating" || step === "quick" || step === "quick-feedback" ? 2 : step === "method" || step === "criterion" || step === "complete" ? 3 : step === "generating" || step === "report" || step === "email-ready" || step === "final-feedback" ? 4 : 5;
const safeLink = (url: string) => /^https:\/\//.test(url) ? url : "";
const quickSteps = ["Reading your Trustees’ Annual Report", "Finding purposes, activities and public benefit", "Looking for achievements, outcomes and impact", "Checking future plans and learning", "Mapping evidence to SORP 2026", "Assessing the 15 areas", "Calculating your published-reporting score"];
const reportSteps = ["Bringing together your published evidence", "Adding your current responses and context", "Comparing published reporting with your current view", "Checking the relevant SORP 2026 requirements", "Prioritising what matters most", "Turning findings into practical next steps", "Preparing your personalised PDF"];
const quickMessages = ["SORP 2026 is our source of truth.", "We assess published reporting across 15 SORP-mapped areas.", "AI interprets the evidence. A fixed method calculates the score.", "This is your published starting point. Next, tell us where things stand today.", "Good impact reporting starts before year-end. Useful information also supports better decisions."];
const reportMessages = ["TWO VIEWS. ONE CLEARER PICTURE.\nWe are comparing your published report with where you say things stand today.", "SORP IS THE REQUIREMENT. BETTER IMPACT IS THE OPPORTUNITY.\nStrong impact information should also support better decisions throughout the year.", "DON’T WAIT UNTIL YEAR-END.\nThe best reporting grows from evidence and learning already in use.", "BUILT WITH THE IDEAS SHED.\nWe build useful digital tools for charities and purpose-led organisations. More tools are coming."];
const roles = ["CEO / SENIOR LEADER", "TRUSTEE / CHAIR", "FINANCE / TREASURER", "IMPACT / EVALUATION", "PROGRAMME / DELIVERY", "FUNDRAISING / DEVELOPMENT", "COMMUNICATIONS / MARKETING", "ACCOUNTANT / AUDITOR / ADVISER", "OTHER"];
const areaLabels = ["Purpose", "Public benefit", "Objectives", "Programmes", "Measures", "Outputs & outcomes", "Impact evidence", "Achievements", "Performance", "Claims", "Learning", "External factors", "Future plans", "Narrative & finances", "Findability"];
const pause = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

async function post(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error || "That step could not be completed. Please try again.");
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

function FeedbackPanel({ rating, comment, status, onRating, onComment, onCommentBlur }: { rating: number; comment: string; status: string; onRating: (value: number) => void; onComment: (value: string) => void; onCommentBlur: () => void }) {
  return <div className="scr-feedback"><div className="scr-stars" role="group" aria-label="Usefulness rating">{[1, 2, 3, 4, 5].map(value => <button key={value} type="button" aria-label={`${value} out of 5`} aria-pressed={rating === value} onClick={() => onRating(value)}>{value <= rating ? "★" : "☆"}</button>)}</div><div className="scr-star-scale"><span>1 = NOT VERY USEFUL</span><span>5 = EXTREMELY USEFUL</span></div><label className="scr-context">ANYTHING WE COULD IMPROVE?<textarea rows={3} value={comment} onChange={e => onComment(e.target.value)} onBlur={onCommentBlur} placeholder="Optional" maxLength={2000}/></label>{status && <p className={status === "error" ? "scr-feedback-error" : "scr-saved"} role="status">{status === "saving" ? "SAVING FEEDBACK…" : status === "saved" ? "✓ FEEDBACK SAVED" : "Feedback could not be sent just now. You can still continue."}</p>}</div>;
}

export function SorpCandidateReview() {
  const [saved, setSaved] = useState<Saved>(initial);
  const [navigation, setNavigation] = useState<ReviewHistory>({ past: [], current: locationOf(initial), future: [] });
  const [loaded, setLoaded] = useState(false);
  const hydrated = useRef(false);
  const previousSaved = useRef<Saved | null>(null);
  const [busy, setBusy] = useState("");
  const [homeworkReveal, setHomeworkReveal] = useState(8);
  const [error, setError] = useState("");
  const [generation, setGeneration] = useState<string[]>([]);
  const [progressClock, setProgressClock] = useState(0);
  const [generationReady, setGenerationReady] = useState(false);
  const [milestone, setMilestone] = useState("");
  const [support, setSupport] = useState<SupportChoice>(5);
  const [custom, setCustom] = useState("");
  const [checkout, setCheckout] = useState<{ clientSecret: string; sessionId: string } | null>(null);
  const [emailMismatch, setEmailMismatch] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState<{ quick: string; final: string }>({ quick: "", final: "" });

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    let restored: Saved;
    try { const stored = JSON.parse(localStorage.getItem(KEY) || "null"); restored = stored?.sessionId ? { ...initial, ...stored, emailConfirm: stored.emailConfirm || stored.email || "", reportView: Math.min(stored.reportView || 0, 1), corrections: Object.fromEntries(Object.entries(stored.corrections || {}).map(([id, value]) => { const correction = (value && typeof value === "object" ? value : { context: "", reviewed: false }) as Correction; return [id, { ...correction, savedContext: correction.savedContext ?? correction.context }]; })), step: stored.step === "generating" ? "complete" : stored.step === "quick-generating" ? "homework" : stored.step } : { ...initial, sessionId: crypto.randomUUID() }; }
    catch { restored = { ...initial, sessionId: crypto.randomUUID() }; setError("This browser could not restore a saved review. Please keep this page open until your PDF arrives."); }
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
  useEffect(() => { if (!busy) return; setProgressClock(0); const timer = window.setInterval(() => setProgressClock(value => value + 1), 3800); return () => window.clearInterval(timer); }, [busy]);
  useEffect(() => { if (!milestone) return; const timer = window.setTimeout(() => setMilestone(""), 1800); return () => window.clearTimeout(timer); }, [milestone]);
  function event(type: string, extra = {}) { void trackSorpEvent(saved.sessionId, type, { organisation: saved.candidate?.name, readinessScore: saved.report?.tar.score ?? undefined, ...extra }, false); }
  async function saveFeedback(phase: "quick" | "final", rating: number, comment: string) {
    if (!rating && !comment.trim()) return;
    setFeedbackStatus(current => ({ ...current, [phase]: "saving" }));
    try { await post("/api/published-review", { operation: "feedback", sessionId: saved.sessionId, organisation: saved.candidate?.name, rating, comment, phase }); setFeedbackStatus(current => ({ ...current, [phase]: "saved" })); event(phase === "quick" ? "quick_review_feedback_submitted" : "full_review_feedback_submitted", { rating }); }
    catch { setFeedbackStatus(current => ({ ...current, [phase]: "error" })); }
  }
  function go(step: Step) { setError(""); setSaved(current => ({ ...current, step })); }
  const report = saved.report;
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
      setSaved(state => ({ ...state, research: data.research, intelligence: data.intelligence, candidate: null, state: null, report: null, emailSent: false, corrections: {} }));
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
    setSaved(state => ({ ...state, candidate, state: null, step: "confirmation" }));
  }
  async function startHomework() {
    if (!saved.candidate || busy) return;
    if (saved.state) { go("homework"); return; }
    const candidate = saved.candidate;
    go("homework");
    setHomeworkReveal(0);
    setBusy("profile"); setError("");
    try { const data = await post("/api/published-review", { operation: "profile", candidate, sessionId: saved.sessionId, intelligencePin: saved.intelligence }); setSaved(state => ({ ...state, candidate: data.candidate, state: data.state, intelligence: data.intelligence })); for (let index = 1; index <= 8; index++) { await pause(100); setHomeworkReveal(index); } }
    catch (cause) { setError(cause instanceof Error ? cause.message : "We could not inspect that organisation yet."); }
    finally { setBusy(""); }
  }
  async function review(e?: React.FormEvent) {
    e?.preventDefault(); if (!saved.candidate || !saved.email.trim() || !saved.intelligence || busy) return;
    if (saved.email.trim().toLowerCase() !== saved.emailConfirm.trim().toLowerCase()) { setEmailMismatch(true); return; }
    setEmailMismatch(false);
    const started = performance.now();
    setBusy("tar"); setError(""); setGenerationReady(false); setGeneration([]); go("quick-generating"); event("email_captured");
    try {
      const data = await post("/api/published-review", { operation: "tar", candidate: saved.candidate, state: saved.state, sessionId: saved.sessionId, intelligencePin: saved.intelligence });
      const lens = data.lens as Lens;
      const next: Report = { candidate: saved.candidate, tar: lens, wider: emptyLens("wider", "Wider evidence was deliberately not assessed in this published-reporting review."), createdAt: new Date().toISOString(), intelligence: saved.intelligence };
      setGenerationReady(true);
      await revealSteps(quickSteps);
      await pause(Math.max(0, 6500 - (performance.now() - started)));
      setSaved(state => ({ ...state, report: next, email: state.email.trim(), step: saved.candidate?.entityType === "registered_charity" ? "quick" : "non-sorp" }));
      event("public_research_completed", { readinessScore: lens.score ?? undefined, evidenceConfidence: lens.confidence }); event("quick_review_reached"); event("tar_score", { readinessScore: lens.score ?? undefined });
    } catch (cause) { setSaved(state => ({ ...state, step: "homework" })); setError(cause instanceof Error ? cause.message : "The statutory review could not finish. Please retry."); }
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
      const data = await post("/api/readiness/report-email", { sessionId: saved.sessionId, email: saved.email, name: saved.name, role: saved.role === "OTHER" ? saved.roleOther : saved.role, shareRequestWithMsi: true, organisation: saved.candidate?.name, result: resultWithContext(report), impactMode: false });
      if (!data.ok || !data.attachment?.endsWith(".pdf")) throw new Error("The full PDF was not confirmed as attached. Please retry.");
      setGenerationReady(true);
      await revealSteps(reportSteps);
      await pause(Math.max(0, 12000 - (performance.now() - started)));
      setSaved(state => ({ ...state, emailSent: true, step: "report", reportView: 0 })); event("pdf_email_sent"); event("full_report_viewed");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Email failed. No success was confirmed."); setSaved(state => ({ ...state, step: "complete" })); }
    finally { setBusy(""); setGenerationReady(false); }
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
    if (saved.step === "intro") return <><p className="scr-kicker">WHY THIS MATTERS</p><div className="scr-sie-visual" role="img" aria-label="Social Impact Excellence: Purpose, Leadership, Data, Delivery and Communication"><svg viewBox="0 0 300 300" aria-hidden="true"><circle className="scr-sie-ring" cx="150" cy="150" r="108" /><circle className="scr-sie-ring-inner" cx="150" cy="150" r="84" /><path className="scr-sie-arc" d="M150 42 A108 108 0 0 1 252 114 M245 202 A108 108 0 0 1 166 257 M46 180 A108 108 0 0 1 79 69" /><path className="scr-sie-ticks" d="M150 26V42 M35 102L49 108 M251 108L265 102 M68 243L80 231 M220 231L232 243" /></svg><strong className="scr-sie-centre">SOCIAL IMPACT<br /><em>EXCELLENCE</em></strong><span className="scr-sie-pillar scr-sie-purpose">PURPOSE</span><span className="scr-sie-pillar scr-sie-leadership">LEADERSHIP</span><span className="scr-sie-pillar scr-sie-data">DATA</span><span className="scr-sie-pillar scr-sie-delivery">DELIVERY</span><span className="scr-sie-pillar scr-sie-communication">COMMUNICATION</span></div><p className="scr-sie-statement">Impact reporting is easier when impact is managed throughout the year.</p><p className="scr-sie-support">SORP reporting is one output of stronger impact practice, not the whole job.</p></>;
    if (saved.step === "find") return <><p className="scr-kicker">GOOD TO KNOW</p><h2>SORP 2026 HAS THREE REPORTING TIERS.</h2><div className="scr-tier-visual" role="group" aria-label="SORP 2026 reporting tiers"><div><span>TIER 1</span><strong>£500k or less</strong></div><div><span>TIER 2</span><strong>Over £500k to £15m</strong></div><div><span>TIER 3</span><strong>Over £15m</strong></div></div><p>Your tier affects which SORP reporting requirements apply.</p></>;
    if (saved.step === "confirmation") return <><p className="scr-kicker">IDENTITY CHECK</p><h2>Is this your charity?</h2><p>Check the legal name, charity number and official sources. The website is shown to confirm identity, not used in the published-report score.</p></>;
    if (saved.step === "homework") return <><p className="scr-kicker">WHAT HAPPENS NEXT</p><h2>A published starting point.</h2><p>We’ll assess the Trustees’ Annual Report and accounts against 15 areas mapped to SORP 2026. You’ll get a quick view before telling us where things stand today.</p></>;
    if (saved.step === "quick-generating") return <><p className="scr-kicker">HOW THIS WORKS</p><h2>SORP 2026 IS OUR SOURCE OF TRUTH.</h2><p>We compare your latest published Trustees’ Annual Report and accounts against 15 areas mapped to SORP 2026.</p><p>My Social Impact’s methodology interprets the published evidence and applies a fixed scoring approach to give you a historical SORP-readiness starting point.</p><p>Next, you’ll tell us what has changed since then.</p></>;
    if (saved.step === "quick") return <><p className="scr-kicker">WHAT THIS TELLS YOU</p><h2>Your report was the starting point.</h2><p>This shows what the latest published Trustees’ Annual Report and accounts demonstrated against SORP 2026. Your organisation may already have moved on. Next, tell us where things stand today.</p></>;
    if (saved.step === "quick-feedback" || saved.step === "final-feedback") return <><p className="scr-kicker">OPTIONAL FEEDBACK</p><h2>Help the next charity.</h2><p>A rating or comment helps us improve this free tool. You can continue without leaving feedback.</p></>;
    if (saved.step === "method") return <><p className="scr-kicker">WHAT YOU’RE DOING NOW</p><h2>Today’s view is yours.</h2><p>Published evidence tells us where the report was. Your answers help show where you believe the organisation is now.</p></>;
    if (saved.step === "criterion") return <><p className="scr-kicker">YOUR PROGRESS</p><h2>{reviewedCount} of 15 reviewed.</h2><div className="scr-rail-meter"><span style={{ width: `${reviewedCount / 15 * 100}%` }} /></div><ol className="scr-rail-areas">{areaLabels.map((label, index) => <li key={label} className={index === saved.criterion ? "is-current" : index < saved.criterion || saved.corrections[String(index + 1)]?.reviewed ? "is-reviewed" : ""}><span>{saved.corrections[String(index + 1)]?.reviewed ? "✓" : index + 1}</span>{label}</li>)}</ol><p className="scr-guide-note">{saved.criterion < 5 ? "Good impact reporting starts with information you can use throughout the year." : saved.criterion < 10 ? "MUST is required. SHOULD is recommended. MAY is optional. MSI judgement is labelled separately." : "Better evidence supports better decisions, not just a stronger annual report."}</p></>;
    if (saved.step === "complete") return <><p className="scr-kicker">WHAT HAPPENS NOW</p><h2>From two views to priorities.</h2><p>We’ll compare the published starting point with your self-reported position, then include your saved comments as context for what comes next.</p></>;
    if (saved.step === "generating") return <><p className="scr-kicker">YOUR PERSONALISED REPORT</p><h2>Useful information, not just compliance.</h2><p>Better evidence helps trustees and managers make decisions during the year, not only write a report afterwards.</p></>;
    if (saved.step === "report") return saved.reportView === 0 ? <><p className="scr-kicker">WHY THE COMPARISON MATTERS</p><h2>What changed?</h2><p>The first score is our published-evidence assessment. The second is your current self-reported view. Their difference highlights what may need attention or what the next report should capture.</p><p className="scr-guide-note">Want to talk through the difference? My Social Impact can help.</p></> : <><p className="scr-kicker">YOUR ACTION PLAN</p><h2>Use this during the year.</h2><p>The report gives you priorities and your own comments to discuss with colleagues or trustees. Your PDF holds the full source-by-source detail.</p></>;
    if (saved.step === "email-ready") return <><p className="scr-kicker">KEEP YOUR REPORT</p><h2>Share it and use it.</h2><p>The PDF is yours to share with trustees or colleagues, use as an action plan, or bring to a conversation with My Social Impact.</p></>;
    if (saved.step === "support") return <><p className="scr-kicker">YOUR REPORT IS YOURS</p><h2>Optional support.</h2><p>No contribution is needed to receive your report. Supporting the free tool helps us offer it to more charities.</p></>;
    if (saved.step === "next") return <><p className="scr-kicker">HOW MSI CAN HELP</p><h2>Compliance is a starting point.</h2><p>Stronger evidence, learning and decisions can improve impact beyond the annual report.</p></>;
    if (saved.step === "done") return <><p className="scr-kicker">REVIEW COMPLETE</p><h2>Your report is ready to use.</h2><p>Return to it when planning your next Trustees’ Annual Report or discussing priorities with colleagues.</p></>;
    return <><p className="scr-kicker">THE RIGHT ENTITY</p><h2>Let’s check the charity record.</h2><p>A non-charity entity should not be assessed as if SORP applies to it.</p></>;
  }

  if (!loaded) return <main className="sorp-conversation-page scr-page"><p className="scr-loading">Opening your SORP review…</p></main>;
  return <main className={`sorp-conversation-page scr-page${saved.step === "intro" ? " scr-page--intro" : saved.step === "find" ? " scr-page--find" : ""}`}>
    <header className="sorp-workspace-brand"><Link href="/are-you-sorp-ready"><span>My Social Impact</span><strong>Are You SORP Ready?</strong></Link><div className="sorp-workspace-brand-meta"><p>SORP is the requirement.<br /><strong>Better impact is the opportunity.</strong></p></div></header>
    <div className="scr-top">{saved.step !== "intro" && saved.step !== "find" && <div><small>{BUILD}</small><h2>{saved.step === "done" ? "You’re done" : phases[phase]}</h2></div>}<nav aria-label="Review progress">{phases.map((label, index) => <span key={label} className={saved.step === "done" || index < phase ? "is-complete" : index === phase ? "is-current" : ""}><i>{saved.step === "done" || index < phase ? "✓" : index + 1}</i><b>{label}</b></span>)}</nav></div>
    <div className="scr-workspace"><aside className="scr-guide">{guide()}</aside>
      <section className="scr-main" aria-live="polite">
        {milestone && <div className="scr-milestone" role="status">{milestone}</div>}
        {saved.step === "intro" && <><p className="scr-kicker">SORP 2026 IS NOW IN EFFECT.</p><h1>Are you SORP ready?</h1><p className="scr-lead">For relevant charities, SORP 2026 applies to reporting periods beginning on or after 1 January 2026.</p><div className="scr-philosophy">SORP IS THE REQUIREMENT.<br /><strong>BETTER IMPACT IS THE OPPORTUNITY.</strong></div><h2>WHAT YOU’LL GET</h2><ol className="scr-intro-steps"><li><div><h3>YOUR SORP STARTING POINT</h3><p>A free review of your latest published Trustees’ Annual Report and accounts against SORP 2026.</p><p>See how ready your published reporting appears.</p></div></li><li><div><h3>YOUR CURRENT READINESS</h3><p>Update our assessment with what has changed and where things stand now.</p><p>Add your own answers, comments and current knowledge.</p></div></li><li><div><h3>A PROFESSIONAL REVIEW</h3><p>Get your personalised report and, if useful, talk the results through with My Social Impact.</p><p>Use it as a starting point for improving SORP readiness and moving towards Social Impact Excellence.</p></div></li></ol><p className="scr-intro-free">FREE REVIEW · PERSONALISED PDF · OPTIONAL PROFESSIONAL FOLLOW-UP</p></>}
        {saved.step === "find" && <><p className="scr-kicker">01 / FIND YOUR CHARITY</p><h1>LET’S GET STARTED.</h1><p>Enter the registered charity name or charity number. We’ll confirm we’ve found the right organisation before reviewing anything.</p><form id="scr-find-form" onSubmit={find} className="scr-find"><label htmlFor="scr-query">Charity name or number</label><input id="scr-query" value={saved.query} onChange={e => setSaved(state => ({ ...state, query: e.target.value, research: null, candidate: null, state: null }))} placeholder="e.g. Interim Spaces or 1165694"/></form>{busy && <div className="scr-search-progress" role="status"><h2>FINDING YOUR CHARITY…</h2><EvidenceChecklist candidate={saved.candidate} research={saved.research} tier={reportingTier} busy phase="identity" /></div>}{saved.candidate && saved.research && !busy && <div className="scr-search-progress" role="status"><h2>WE FOUND A MATCH ✓</h2><EvidenceChecklist candidate={saved.candidate} research={saved.research} tier={reportingTier} busy={false} phase="identity" /></div>}{saved.research && !saved.candidate && !busy && <div className="scr-results"><h2>{saved.research.candidates.length ? "Choose the right registered organisation" : "We need one more clue."}</h2>{saved.research.candidates.map(candidate => <article key={`${candidate.registrationNumber}-${candidate.name}`}><div><strong>{candidate.name}</strong><p>{candidate.locality} · {candidate.registrationNumber || candidate.entityType}</p></div><button type="button" onClick={() => confirmCandidate(candidate)}>VIEW THIS CHARITY →</button></article>)}{!saved.research.candidates.length && <p>Try the registered name, charity number or a location.</p>}</div>}</>}
        {saved.step === "confirmation" && saved.candidate && <><p className="scr-kicker">WE FOUND YOU ✓</p><h1>{saved.candidate.name}</h1><div className="scr-fact"><span>Charity number</span><strong>{saved.candidate.registrationNumber || "Not established"}</strong></div><div className="scr-fact"><span>Charity Commission record</span><strong>{safeLink(saved.candidate.officialUrl) ? <a href={saved.candidate.officialUrl} target="_blank" rel="noreferrer">VIEW OFFICIAL RECORD ↗</a> : "Not available"}</strong></div><div className="scr-fact"><span>Official website</span><strong>{safeLink(saved.candidate.website) ? <a href={saved.candidate.website} target="_blank" rel="noreferrer">VIEW WEBSITE ↗</a> : "Not found"}</strong></div>{saved.candidate.locality && <div className="scr-fact"><span>Location</span><strong>{saved.candidate.locality}</strong></div>}<p className="scr-muted">Check the details below to confirm we’ve found the right charity.</p></>}
        {saved.step === "homework" && <><p className="scr-kicker">{saved.state && !busy ? "PUBLIC HOMEWORK COMPLETE ✓" : "DOING THE PUBLIC HOMEWORK…"}</p><h1>{saved.state && !busy ? "We found what we need." : "Checking the public record."}</h1><EvidenceChecklist candidate={saved.state ? saved.candidate : null} research={saved.research} tier={saved.state ? reportingTier : "Not yet confirmed"} busy={!!busy} phase="homework" visible={homeworkReveal} />{saved.state && <><p className="scr-lead">{saved.candidate?.entityType === "registered_charity" ? "SORP 2026 applies to this charity for relevant future reporting periods." : "We need to confirm this entity’s charity status before assessing SORP."}</p><div className="scr-fact"><span>Latest published accounts / TAR</span><strong>{safeLink(saved.candidate?.reportUrl || "") ? <a href={saved.candidate?.reportUrl} target="_blank" rel="noreferrer">{saved.candidate?.reportTitle || "VIEW PUBLISHED REPORT"} ↗</a> : "Not established"}</strong></div><div className="scr-fact"><span>Reporting period</span><strong>{saved.candidate?.reportPeriod || "Not established"}</strong></div><div className="scr-fact"><span>Accounting basis</span><strong>{saved.candidate?.accountingBasis === "unknown" ? "Not established" : saved.candidate?.accountingBasis === "accruals" ? `${["HIGH", "ESTABLISHED"].includes(saved.candidate.accountingBasisConfidence?.toUpperCase()) ? "" : "Likely "}accruals accounts${["HIGH", "ESTABLISHED"].includes(saved.candidate.accountingBasisConfidence?.toUpperCase()) ? "" : " — not yet verified"}` : saved.candidate?.accountingBasis === "receipts" ? `${["HIGH", "ESTABLISHED"].includes(saved.candidate.accountingBasisConfidence?.toUpperCase()) ? "" : "Likely "}receipts and payments${["HIGH", "ESTABLISHED"].includes(saved.candidate.accountingBasisConfidence?.toUpperCase()) ? "" : " — not yet verified"}` : "Not established"}</strong></div><div className="scr-fact"><span>Published gross income</span><strong>{saved.candidate?.latestIncome == null ? "Not established" : new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(saved.candidate.latestIncome)}</strong></div><div className="scr-tier"><small>SORP 2026 REPORTING TIER</small><strong>{reportingTier}</strong><p>{reportingTier === "Not yet confirmed" ? "The current record does not establish a tier." : `The latest published income places ${saved.candidate?.name} in ${reportingTier}. That determines which SORP requirements apply.`}</p></div><p>This Quick Review will assess your latest published Trustees’ Annual Report and accounts.</p><h2>Where should we send your personalised report?</h2><p>Please enter your email twice so the PDF reaches the right address.</p><form id="scr-email-form" onSubmit={review} className="scr-fields"><label className={emailMismatch ? "is-invalid" : ""}>Email (required)<input required type="email" value={saved.email} onChange={e => { setEmailMismatch(false); setSaved(state => ({ ...state, email: e.target.value })); }} /></label><label className={emailMismatch ? "is-invalid" : ""}>Confirm email (required)<input required type="email" value={saved.emailConfirm} onChange={e => { setEmailMismatch(false); setSaved(state => ({ ...state, emailConfirm: e.target.value })); }} /></label>{emailMismatch && <p className="scr-field-error" role="alert">Those email addresses don’t match. Please check them before continuing.</p>}<label>Name (optional)<input value={saved.name} onChange={e => setSaved(state => ({ ...state, name: e.target.value }))} /></label><label>Role (optional)<select value={saved.role} onChange={e => setSaved(state => ({ ...state, role: e.target.value }))}><option value="">Choose a role</option>{roles.map(role => <option key={role} value={role}>{role}</option>)}</select></label>{saved.role === "OTHER" && <label>Describe your role<input value={saved.roleOther} onChange={e => setSaved(state => ({ ...state, roleOther: e.target.value }))}/></label>}</form></>}</>}
        {saved.step === "quick-generating" && <><p className="scr-kicker">BUILDING YOUR QUICK REVIEW…</p><h1>Reading what your report shows.</h1><div className="scr-progress-message scr-quick-message" role="status">{quickMessages.map(message => <span className="scr-message-size" aria-hidden="true" key={message}>{message}</span>)}<span>{quickMessages[progressClock % quickMessages.length]}</span></div><ProgressSequence items={quickSteps} complete={generation.length} active={generationReady ? Math.min(generation.length, quickSteps.length - 1) : 0}/><p className="scr-muted">Completed checks are marked when the assessment returns.</p></>}
        {saved.step === "quick" && tar && <><p className="scr-kicker">YOUR PUBLISHED STARTING POINT IS READY ✓</p><h1>Published-reporting readiness.</h1><div className="scr-result"><strong>{tar.score ?? "—"}<small>/100</small></strong><div><b className={tar.score === null ? "is-unknown" : ""}>{band(tar.score)}</b><p>Confidence: {tar.confidence}</p></div></div><p>Based only on what we could establish from your latest published Trustees’ Annual Report and accounts.</p><div className="scr-columns"><div><h2>What looks strong</h2>{strong.length ? strong.slice(0, 3).map(f => <p key={f.fieldId}>{f.finding}</p>) : <p>No clear strengths could be established from the material inspected.</p>}</div><div><h2>Important gaps</h2>{gaps.length ? gaps.slice(0, 3).map(f => <p key={f.fieldId}>{f.finding}</p>) : <p>No material gaps were identified in the inspected material.</p>}</div></div><h2>Top priorities</h2><ol>{priorities.slice(0, 3).map(f => <li key={f.fieldId}>{f.action}</li>)}</ol></>}
        {saved.step === "quick-feedback" && <><p className="scr-kicker">OPTIONAL · A FEW SECONDS</p><h1>How useful was that Quick Review?</h1><p>This is a free tool and we genuinely want to keep improving it. Your rating and comments help us make it more useful for the next charity.</p><FeedbackPanel rating={saved.quickRating} comment={saved.quickComment} status={feedbackStatus.quick} onRating={value => { setSaved(state => ({ ...state, quickRating: value })); void saveFeedback("quick", value, saved.quickComment); }} onComment={value => { setFeedbackStatus(current => ({ ...current, quick: "" })); setSaved(state => ({ ...state, quickComment: value })); }} onCommentBlur={() => void saveFeedback("quick", saved.quickRating, saved.quickComment)}/></>}
        {saved.step === "method" && <><p className="scr-kicker">YOUR CURRENT READINESS</p><h1>Your published report is the starting point.<br />Now let’s see where you are today.</h1><p>The Quick Review looked only at what your latest published report demonstrated. SORP 2026 applies to relevant reporting periods beginning on or after 1 January 2026. A lot may have changed since your last report.</p><p>We’ve already assessed 15 areas from published evidence. Review our suggested answers and tell us where you think things stand now.</p><h2>Why do this?</h2><p>Your answers will give you a current self-reported readiness view to compare with your published starting point. Comments you add will appear in your personalised report and can help form an agenda if you choose to talk through the results with My Social Impact. Your PDF can be shared with colleagues and trustees.</p><details className="scr-details"><summary>HOW WE ARRIVED AT THE PUBLISHED SCORE <span>+</span></summary><div className="scr-method-flow"><div><b>01</b><strong>SORP 2026</strong><span>Our source of truth.</span></div><div><b>02</b><strong>15 assessment areas</strong><span>Mapped to relevant requirements and guidance.</span></div><div><b>03</b><strong>Your published evidence</strong><span>AI interprets what the TAR and accounts show.</span></div><div><b>04</b><strong>Fixed scoring method</strong><span>The score is calculated consistently from those assessments.</span></div></div><div className="scr-method-legend"><span>MUST</span><span>SHOULD</span><span>MAY</span><span>MSI / HUMAN JUDGEMENT</span></div><p>Each area lets you open the relevant SORP basis and published evidence. Your current view does not change the historical published score.</p></details></>}
        {saved.step === "criterion" && current && <><p className="scr-kicker">QUESTION {saved.criterion + 1} OF 15 · {classificationLabel(current.finding.classification)}</p><div className="scr-area-progress" aria-label={`${reviewedCount} of 15 areas reviewed`}>{areaLabels.map((label, index) => <span key={label} className={saved.corrections[String(index + 1)]?.reviewed ? "is-reviewed" : index === saved.criterion ? "is-current" : ""} />)}</div><h1>{current.question.question}</h1><p>Review our published-evidence answer and tell us where things stand now.</p><p className="scr-subhead">MSI PUBLISHED-EVIDENCE VIEW</p><strong className={`scr-assessment ${current.finding.answer === "not_sure" || current.finding.confidence === "LOW" ? "is-uncertain" : ""}`}>{scale.find(item => item.value === current.finding.answer)?.label}</strong><p className="scr-subhead">WHY WE SAID THIS</p><p>{current.finding.reason}</p><p className="scr-confidence">Evidence confidence: {current.finding.confidence}</p><details className="scr-details"><summary>SEE THE SORP BASIS <span>+</span></summary><FindingSource finding={current.finding} /></details><p className="scr-subhead">YOUR CURRENT VIEW</p><p className="scr-muted">Choose a different answer if something has changed. Your current view is kept separate from the published assessment.</p><div className="scr-answer-grid">{scale.map(option => { const selected = correction?.answer === option.value; const suggested = current.finding.answer === option.value; return <button type="button" key={option.value} aria-pressed={selected || suggested && !correction?.answer} onClick={() => updateCorrection({ answer: suggested ? undefined : option.value })} className={`${selected ? "is-selected" : ""} ${suggested ? "is-suggested" : ""} ${suggested && option.value === "not_sure" ? "is-uncertain" : ""}`}><span>{option.label}{suggested && <small>MSI VIEW</small>}{selected && <small>YOUR CURRENT VIEW</small>}</span><span>{selected ? "✓" : "→"}</span></button>; })}</div><label className="scr-context" htmlFor="scr-context">ADD A COMMENT<textarea id="scr-context" value={correction?.context || ""} onChange={e => updateCorrection({ context: e.target.value })} rows={3} maxLength={4000} placeholder="What has changed, or what should we know?" /></label><p className="scr-muted">Explain a different answer or note something you may want to discuss later. Saved comments appear in your report.</p><div className="scr-context-actions"><button type="button" className="scr-clear" disabled={!correction?.context?.trim() || correction.savedContext === correction.context} onClick={() => updateCorrection({ savedContext: correction?.context || "" })}>SAVE MY COMMENT</button>{correction?.context?.trim() && correction.savedContext === correction.context && <span role="status">✓ COMMENT SAVED</span>}</div>{(correction?.answer || correction?.savedContext) && <div className="scr-current-view"><p><b>MSI’s published-evidence view:</b> {scale.find(item => item.value === current.finding.answer)?.label}</p><p><b>Your current view:</b> {scale.find(item => item.value === (correction?.answer || current.finding.answer))?.label}</p>{correction?.savedContext && <p><b>Your saved comment:</b> {correction.savedContext}</p>}</div>}{correction?.answer && <button type="button" className="scr-clear" onClick={() => updateCorrection({ answer: undefined })}>KEEP MSI’S ORIGINAL ASSESSMENT</button>}</>}
        {saved.step === "complete" && <><p className="scr-kicker">15 OF 15 COMPLETE ✓</p><h1>Thank you. Your current view is in.</h1><p className="scr-lead">We now have two clearly labelled views:</p><div className="scr-confirmed"><p>✓ What your published reporting showed</p><p>✓ Where you say things stand now</p></div><p>We’ll compare them and bring your saved comments into your personalised report.</p><p className="scr-muted">Your current answers do not rewrite the historical published-report score.</p></>}
        {saved.step === "generating" && <><p className="scr-kicker">BUILDING YOUR PERSONALISED REPORT…</p><h1>Bringing your review together.</h1><div className="scr-progress-message" role="status">{reportMessages[progressClock % reportMessages.length]}</div><ProgressSequence items={reportSteps} complete={generation.length} active={generationReady ? Math.min(generation.length, reportSteps.length - 1) : 0}/></>}
        {saved.step === "report" && report && <>
          <p className="scr-kicker">YOUR PERSONALISED REPORT · {saved.reportView + 1} OF 2</p>
          {saved.reportView === 0 && <>
            <h1>Where you stand now.</h1>
            <div className="scr-score-comparison">
              <div><small>PUBLISHED STARTING POINT</small><strong>{tar?.score ?? "—"}<em>/100</em></strong><p>Based only on your latest published Trustees’ Annual Report and accounts.</p></div>
              <span aria-hidden="true">VS</span>
              <div><small>CURRENT SELF-REPORTED READINESS</small><strong>{currentScore ?? "—"}<em>{currentScore === null ? "" : "/100"}</em></strong><p>Based on the answers you gave us today. Self-reported, not independently verified.</p></div>
            </div>
            {currentScore === null ? <p className="scr-muted">There are not enough reviewed current answers to calculate a meaningful second score. We will not invent one.</p> : <p className="scr-score-explanation">{scoreDifference === null ? "The published-reporting score was unavailable, so there is no numerical comparison." : scoreDifference > 0 ? "Your current view is stronger than your published starting point. Some things may have moved forward. Your next report will need evidence of that progress." : scoreDifference < 0 ? "Your current view is more cautious than the published starting point. That may reveal a clearer gap or work to do before the next reporting period." : "Your current view broadly matches what your published reporting demonstrated."} This does not change what was historically published.</p>}
            <div className="scr-columns"><div><h2>Your biggest strengths</h2>{strong.slice(0, 3).map(f => <p key={f.fieldId}>{f.finding}</p>)}</div><div><h2>Your biggest gaps</h2>{gaps.slice(0, 3).map(f => <p key={f.fieldId}>{f.finding}</p>)}</div></div>
            {changedAnswers.length > 0 && <><h2>What changed between the two views</h2><div className="scr-report-list">{changedAnswers.map(({ question, finding }) => <p key={question.id}>{question.question}<br /><strong>{scale.find(item => item.value === finding.answer)?.label} → {scale.find(item => item.value === saved.corrections[String(question.id)]?.answer)?.label}</strong></p>)}</div></>}
            <details className="scr-details"><summary>SEE THE FULL 15-AREA ASSESSMENT <span>+</span></summary><div className="scr-report-list">{questions.map(({ question, finding }) => <details key={question.id}><summary><span>{String(question.id).padStart(2, "0")} · {question.question}</span><b>{scale.find(item => item.value === finding.answer)?.label}</b></summary><p>{finding.reason}</p><FindingSource finding={finding} /></details>)}</div></details>
          </>}
          {saved.reportView === 1 && <>
            <h1>Your priorities.</h1><h2>Top 3 priorities</h2><ol className="scr-actions">{priorities.slice(0, 3).map(f => <li key={f.fieldId}><strong>{f.action}</strong><p>{f.reason}</p></li>)}</ol>
            {savedComments.length > 0 && <><h2>Your comments and questions</h2><p>These are the issues you highlighted. Use them internally or as a starting agenda if you talk the results through with us.</p>{savedComments.map(({ question }) => <article className="scr-user-note" key={question.id}><h3>{question.id}. {question.question}</h3><p>{saved.corrections[String(question.id)].savedContext}</p></article>)}</>}
            <h2>Before your next reporting period</h2><p>Work through the priorities above and keep evidence of what changes. Impact is not something to reconstruct at year-end. The goal is to make useful impact information part of normal management throughout the year.</p>
          </>}
        </>}
        {saved.step === "email-ready" && <><p className="scr-kicker">YOUR PERSONALISED REPORT IS READY ✓</p><h1>Your report is yours.</h1><div className="scr-email-celebration"><small>WE’VE EMAILED YOUR PDF TO:</small><strong>{saved.email}</strong><span aria-hidden="true">✓</span></div><p>It includes your published starting point, current self-reported readiness, the 15 assessment areas, your comments, SORP sources and your priorities.</p><p>Share it with colleagues or trustees, use it as an internal action plan, or bring it to a conversation with My Social Impact.</p></>}
        {saved.step === "final-feedback" && <><p className="scr-kicker">OPTIONAL · A FEW SECONDS</p><h1>How useful was the full review?</h1><p>We want to keep making this free tool more useful for charities. Your rating and comments genuinely help.</p><FeedbackPanel rating={saved.finalRating} comment={saved.finalComment} status={feedbackStatus.final} onRating={value => { setSaved(state => ({ ...state, finalRating: value })); void saveFeedback("final", value, saved.finalComment); }} onComment={value => { setFeedbackStatus(current => ({ ...current, final: "" })); setSaved(state => ({ ...state, finalComment: value })); }} onCommentBlur={() => void saveFeedback("final", saved.finalRating, saved.finalComment)}/></>}
        {saved.step === "support" && <><p className="scr-kicker">WHAT NEXT · OPTIONAL CONTRIBUTION</p><h1>Help us keep this free.</h1><p className="scr-lead">If this helped, £5, or whatever you can afford, helps us keep developing and running free tools like this, particularly for smaller charities.</p><p>Your report is already yours. This is completely optional.</p>{saved.supportPaid ? <p className="scr-mail">THANK YOU. THAT GENUINELY HELPS ✓</p> : checkout ? <><SorpPublicSupportCheckout clientSecret={checkout.clientSecret} sessionId={checkout.sessionId} onPaid={() => { setSaved(state => ({ ...state, supportPaid: true })); setCheckout(null); }}/><button type="button" className="scr-clear" onClick={() => setCheckout(null)}>CLOSE PAYMENT AND STAY HERE</button></> : <><div className="scr-amounts">{([5, 10, 20, "other"] as const).map(amount => <button key={amount} type="button" aria-pressed={support === amount} onClick={() => setSupport(amount)}>{amount === "other" ? "OTHER" : `£${amount}`}</button>)}</div>{support === "other" && <label className="scr-context">Amount in pounds<input inputMode="decimal" value={custom} onChange={e => setCustom(e.target.value)} /></label>}</>}</>}
        {saved.step === "next" && <><p className="scr-kicker">WHAT NEXT · MY SOCIAL IMPACT</p><h1>SORP ready is the start.<br />Better impact is the opportunity.</h1><p className="scr-lead">Your annual report tells one part of the story. The bigger opportunity is to strengthen the impact information, systems and decisions behind it.</p><div className="scr-next-list"><article><small>01</small><div><h2>Get ready</h2><p>Understand SORP and strengthen reporting.</p></div></article><article><small>02</small><div><h2>Get better</h2><p>Improve evidence, impact data, systems, learning, your Impact Report and wider evidence.</p></div></article><article><small>03</small><div><h2>Get excellent</h2><p>Social Impact Excellence: Purpose, Leadership, Data, Delivery and Communications.</p></div></article><article><small>04</small><div><h2>Communicate responsibly</h2><p>Social Impact Claims Code: Evidence, Proportion, Transparency, Balance and Learning.</p></div></article></div><div className="scr-human"><h2>Want to talk through your results?</h2><p>Your report gives you a starting point. If you want help understanding gaps, reviewing wider evidence or deciding what to prioritise, talk to My Social Impact.</p><a className="scr-link-action" href="mailto:marcus@mysocialimpact.org?subject=SORP%202026%20review" onClick={() => event("book_conversation_clicked")}>TALK TO MY SOCIAL IMPACT →</a><a className="scr-secondary-link" href="mailto:marcus@mysocialimpact.org?subject=10-minute%20SORP%20conversation">REQUEST A 10-MINUTE CONVERSATION ↗</a></div></>}
        {saved.step === "done" && <><p className="scr-kicker">REVIEW COMPLETE ✓</p><h1>You’re done ✓</h1><p className="scr-lead">Your personalised report is in your inbox. Return to it whenever you need your starting point and priorities.</p><div className="scr-done-links"><button type="button" onClick={() => setSaved(state => ({ ...state, step: "report", reportView: 0 }))}>RETURN TO MY REPORT →</button><a href="mailto:marcus@mysocialimpact.org?subject=SORP%202026%20review">TALK TO MY SOCIAL IMPACT ↗</a><a href="https://mysocialimpact.org/" target="_blank" rel="noreferrer">VISIT MY SOCIAL IMPACT ↗</a></div></>}
        {saved.step === "non-sorp" && <><p className="scr-kicker">LEGAL STATUS CHECK</p><h1>We need to pause this SORP review.</h1><p>The entity identified is not a registered charity. Please check the legal entity and charity number before we assess SORP applicability.</p></>}
        {error && <div className="scr-error" role="alert">{error}</div>}
      </section></div>
    <footer className="scr-bottom">
      <div><button type="button" className="scr-back" disabled={!navigation.past.length || !!busy} onClick={back}>← BACK</button><button type="button" className="scr-forward" disabled={!navigation.future.length || !!busy} onClick={forward}>FORWARD →</button></div>
      <div>
        {saved.step === "intro" && <button onClick={() => go("find")}>CHECK MY CHARITY <span>→</span></button>}
        {saved.step === "find" && <button type="submit" form="scr-find-form" disabled={!!busy || !saved.query.trim() || !!saved.research}>FIND MY CHARITY <span>→</span></button>}
        {saved.step === "confirmation" && <><button type="button" className="is-secondary" onClick={() => setSaved(state => ({ ...state, step: "find", research: null }))}>NOT MY CHARITY — TRY AGAIN</button><button onClick={() => void startHomework()}>YES, THIS IS MY CHARITY <span>→</span></button></>}
        {saved.step === "homework" && (saved.report ? <button onClick={() => go("quick")}>RETURN TO QUICK REVIEW <span>→</span></button> : !saved.state ? busy ? <span className="scr-bottom-status">Checking the public evidence…</span> : <button onClick={() => void startHomework()}>RETRY PUBLIC HOMEWORK <span>→</span></button> : <button type="submit" form="scr-email-form" disabled={!!busy || !saved.email.trim()}>BUILD MY QUICK REVIEW <span>→</span></button>)}
        {saved.step === "quick-generating" && <span className="scr-bottom-status">Building your Quick Review…</span>}
        {saved.step === "quick" && <button onClick={() => { go("quick-feedback"); event("snapshot_viewed"); }}>CONTINUE <span>→</span></button>}
        {saved.step === "quick-feedback" && <button onClick={() => go("method")}>SEE WHERE WE ARE NOW <span>→</span></button>}
        {saved.step === "method" && <button onClick={() => { go("criterion"); event("guided_conversation_started"); }}>REVIEW MY CURRENT READINESS <span>→</span></button>}
        {saved.step === "criterion" && <button onClick={nextCriterion}>{saved.criterion === 14 ? "COMPLETE MY CURRENT READINESS" : `GO TO QUESTION ${saved.criterion + 2} OF 15`}<span>→</span></button>}
        {saved.step === "complete" && (saved.emailSent ? <button onClick={() => go("report")}>RETURN TO MY REPORT <span>→</span></button> : <button onClick={() => void buildReport()} disabled={!!busy}>BUILD MY PERSONALISED REPORT <span>→</span></button>)}
        {saved.step === "generating" && <span className="scr-bottom-status">Preparing your personalised report…</span>}
        {saved.step === "report" && <button onClick={() => { if (saved.reportView === 0) setSaved(state => ({ ...state, reportView: 1 })); else go("email-ready"); }}>{saved.reportView === 0 ? "SEE MY PRIORITIES" : "FINISH MY REVIEW"}<span>→</span></button>}
        {saved.step === "email-ready" && <button onClick={() => go("final-feedback")}>CONTINUE <span>→</span></button>}
        {saved.step === "final-feedback" && <button onClick={() => { go("support"); event("support_ask_viewed"); }}>EXPLORE WHAT COMES NEXT <span>→</span></button>}
        {saved.step === "support" && (saved.supportPaid ? <button onClick={() => go("next")}>SEE WHAT COMES NEXT <span>→</span></button> : <><button className="is-secondary" onClick={() => { setCheckout(null); go("next"); }}>NOT NOW <span>→</span></button>{!checkout && <button disabled={!!busy || !supportPence(support, custom)} onClick={() => void contribute()}>{busy === "support" ? "OPENING PAYMENT…" : "CONTRIBUTE"}<span>→</span></button>}</>)}
        {saved.step === "next" && <button onClick={() => go("done")}>FINISH MY REVIEW <span>→</span></button>}
        {saved.step === "non-sorp" && <button onClick={() => go("find")}>SEARCH ANOTHER CHARITY <span>→</span></button>}
      </div>
    </footer>
  </main>;
}
