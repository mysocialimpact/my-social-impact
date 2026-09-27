"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { coreQuestions, answerOptions, tierLabel, type AnswerValue, type AssessmentSetup } from "./sorp-questionnaire";
import { trackSorpEvent } from "./sorp-growth";
import { supportPence, type SupportChoice } from "./sorp-payment-amounts";
import { SorpPublicSupportCheckout } from "./sorp-public-support-checkout";
import { band, classificationLabel, emailResult, emptyLens, highlights, weights, type Candidate, type Finding, type Intelligence, type Lens, type Report, type Research } from "./sorp-public-model";
import "./sorp-candidate-review.css";

type Step = "intro" | "find" | "homework" | "quick-generating" | "quick" | "method" | "criterion" | "complete" | "generating" | "report" | "next" | "support" | "non-sorp";
type Correction = { answer?: AnswerValue; context: string; savedContext?: string; reviewed: boolean };
type Saved = { sessionId: string; step: Step; query: string; research: Research | null; candidate: Candidate | null; state: unknown; intelligence: Intelligence | null; report: Report | null; email: string; name: string; role: string; criterion: number; corrections: Record<string, Correction>; reportView: number; emailSent: boolean; supportPaid: boolean };
const KEY = "msi-sorp-final-candidate-v1";
const BUILD = "REVIEW-2 · 27 SEPTEMBER 2026";
const SORP_SOURCE = "https://www.charitysorp.org/documents/d/guest/charities-sorp-2026-1";
const initial: Saved = { sessionId: "", step: "intro", query: "", research: null, candidate: null, state: null, intelligence: null, report: null, email: "", name: "", role: "", criterion: 0, corrections: {}, reportView: 0, emailSent: false, supportPaid: false };
const phases = ["Find charity", "Public homework", "Quick review", "15 areas", "Your report", "What next"];
const scale = answerOptions.map(({ value, label }) => ({ value, label: label.toUpperCase() }));
const phaseFor = (step: Step) => step === "intro" || step === "find" ? 0 : step === "homework" ? 1 : step === "quick-generating" || step === "quick" ? 2 : step === "method" || step === "criterion" || step === "complete" ? 3 : step === "generating" || step === "report" ? 4 : 5;
const safeLink = (url: string) => /^https:\/\//.test(url) ? url : "";
const quickSteps = ["Reading your Trustees’ Annual Report", "Finding purposes, activities and public benefit", "Looking for achievements, outcomes and impact", "Checking future plans and learning", "Mapping evidence to SORP 2026", "Assessing the 15 areas", "Calculating your published-reporting score"];
const reportSteps = ["Bringing together your published evidence", "Adding your current responses and context", "Comparing published reporting with your current view", "Checking the relevant SORP 2026 requirements", "Prioritising what matters most", "Turning findings into practical next steps", "Preparing your personalised PDF"];
const quickMessages = ["SORP 2026 is our source of truth.", "The 15 areas are mapped to relevant MUST, SHOULD and MAY guidance.", "AI interprets published evidence; a fixed method calculates the score.", "You can inspect the SORP basis behind every assessment."];
const reportMessages = ["SORP IS THE REQUIREMENT. BETTER IMPACT IS THE OPPORTUNITY.", "Good reporting grows from useful evidence and learning throughout the year.", "Better information can help charities make better decisions.", "BUILT WITH THE IDEAS SHED — useful digital tools for charities and purpose-led organisations.", "More free tools are coming."];
const areaLabels = ["Purpose", "Public benefit", "Objectives", "Programmes", "Measures", "Outputs & outcomes", "Impact evidence", "Achievements", "Performance", "Claims", "Learning", "External factors", "Future plans", "Narrative & finances", "Findability"];
const pause = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

async function post(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error || "That step could not be completed. Please try again.");
  return data;
}

function FindingSource({ finding }: { finding: Finding }) {
  return <div className="scr-sources"><p><strong>Published evidence</strong> {finding.excerpt || "We could not establish this from the inspected statutory reporting. That is not proof the practice is absent."}</p>{safeLink(finding.sourceUrl) && <a href={finding.sourceUrl} target="_blank" rel="noreferrer">View published source ↗</a>}<p><strong>SORP basis</strong> {classificationLabel(finding.classification)}{["JUDGEMENT", "MSI_READINESS"].includes(finding.classification) ? " — MSI judgement is not an official SORP category." : ""}</p>{finding.sources.map(source => <p key={`${source.reference}-${source.page}`}><a href={`${SORP_SOURCE}#page=${source.page}`} target="_blank" rel="noreferrer">SORP 2026 · {source.reference} · p.{source.page} ↗</a><br />{source.text}</p>)}</div>;
}

function ProgressSequence({ items, complete, active = 0 }: { items: string[]; complete: number; active?: number }) {
  return <ol className="scr-progress-sequence" aria-label="Review progress">{items.map((item, index) => <li key={item} className={index < complete ? "is-complete" : index === active ? "is-active" : ""}><span aria-hidden="true">{index < complete ? "✓" : index === active ? "◉" : "○"}</span>{item}</li>)}</ol>;
}

export function SorpCandidateReview() {
  const [saved, setSaved] = useState<Saved>(initial);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [generation, setGeneration] = useState<string[]>([]);
  const [progressClock, setProgressClock] = useState(0);
  const [generationReady, setGenerationReady] = useState(false);
  const [milestone, setMilestone] = useState("");
  const [support, setSupport] = useState<SupportChoice>(5);
  const [custom, setCustom] = useState("");
  const [checkout, setCheckout] = useState<{ clientSecret: string; sessionId: string } | null>(null);

  useEffect(() => {
    try { const stored = JSON.parse(localStorage.getItem(KEY) || "null"); setSaved(stored?.sessionId ? { ...initial, ...stored, corrections: Object.fromEntries(Object.entries(stored.corrections || {}).map(([id, value]) => { const correction = (value && typeof value === "object" ? value : { context: "", reviewed: false }) as Correction; return [id, { ...correction, savedContext: correction.savedContext ?? correction.context }]; })), step: stored.step === "generating" ? "complete" : stored.step === "quick-generating" ? "homework" : stored.step } : { ...initial, sessionId: crypto.randomUUID() }); }
    catch { setSaved({ ...initial, sessionId: crypto.randomUUID() }); setError("This browser could not restore a saved review. Please keep this page open until your PDF arrives."); }
    setLoaded(true);
  }, []);
  useEffect(() => { if (loaded) { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch { setError("This browser could not save your progress. Please keep the page open until your PDF arrives."); } } }, [saved, loaded]);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [saved.step, saved.criterion, saved.reportView]);
  useEffect(() => { if (!busy) return; setProgressClock(0); const timer = window.setInterval(() => setProgressClock(value => value + 1), 1800); return () => window.clearInterval(timer); }, [busy]);
  useEffect(() => { if (!milestone) return; const timer = window.setTimeout(() => setMilestone(""), 1800); return () => window.clearTimeout(timer); }, [milestone]);
  function event(type: string, extra = {}) { void trackSorpEvent(saved.sessionId, type, { organisation: saved.candidate?.name, readinessScore: saved.report?.tar.score ?? undefined, ...extra }, false); }
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
  async function revealSteps(items: string[]) {
    setGeneration([]);
    for (const item of items) { await pause(125); setGeneration(previous => [...previous, item]); }
  }

  async function find(e?: React.FormEvent) {
    e?.preventDefault(); if (!saved.query.trim() || busy) return;
    setBusy("find"); setError(""); event("assessment_started");
    try { const data = await post("/api/published-review", { operation: "find", query: saved.query, sessionId: saved.sessionId, intelligencePin: saved.intelligence }); setSaved(state => ({ ...state, research: data.research, intelligence: data.intelligence })); event("organisation_found"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "We could not search just now."); }
    finally { setBusy(""); }
  }
  async function confirm(candidate: Candidate) {
    if (busy) return; setBusy("profile"); setError("");
    try { const data = await post("/api/published-review", { operation: "profile", candidate, sessionId: saved.sessionId, intelligencePin: saved.intelligence }); setSaved(state => ({ ...state, candidate: data.candidate, state: data.state, intelligence: data.intelligence, step: "homework" })); event("organisation_confirmed"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "We could not inspect that organisation yet."); }
    finally { setBusy(""); }
  }
  async function review(e?: React.FormEvent) {
    e?.preventDefault(); if (!saved.candidate || !saved.email.trim() || !saved.intelligence || busy) return;
    const started = performance.now();
    setBusy("tar"); setError(""); setGenerationReady(false); setGeneration([]); go("quick-generating"); event("email_captured");
    try {
      const data = await post("/api/published-review", { operation: "tar", candidate: saved.candidate, state: saved.state, sessionId: saved.sessionId, intelligencePin: saved.intelligence });
      const lens = data.lens as Lens;
      const next: Report = { candidate: saved.candidate, tar: lens, wider: emptyLens("wider", "Wider evidence was deliberately not assessed in this published-reporting review."), createdAt: new Date().toISOString(), intelligence: saved.intelligence };
      setGenerationReady(true);
      await revealSteps(quickSteps);
      await pause(Math.max(0, 12000 - (performance.now() - started)));
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
    setSaved(state => ({ ...state, corrections: { ...state.corrections, [id]: { ...(state.corrections[id] || { context: "" }), savedContext: state.corrections[id]?.context || "", reviewed: true } }, criterion: state.criterion + 1 < 15 ? state.criterion + 1 : state.criterion, step: state.criterion + 1 < 15 ? "criterion" : "complete" }));
    if (!wasReviewed) event("guided_prompt_completed", { currentStage: saved.criterion + 1 });
    if ([4, 9, 14].includes(saved.criterion)) setMilestone(saved.criterion === 4 ? "5 OF 15 REVIEWED ✓ — GOOD PROGRESS" : saved.criterion === 9 ? "10 OF 15 REVIEWED ✓ — NEARLY THERE" : "15 OF 15 REVIEWED ✓");
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
      publishedEvidence: { ...result.publishedEvidence, traceability: [...result.publishedEvidence.traceability, ...notes.map((note, index) => ({ title: `User-supplied context ${index + 1} — not used in the published-evidence score`, detail: note }))] },
      overview: `${result.overview} ${currentScore === null ? "There were not enough reviewed current answers to calculate a separate current-view score." : `Current self-reported view: ${currentScore}/100, based on the 15 answers the user reviewed; not independently verified. The original published-reporting score remains ${value.tar.score ?? "unavailable"}/100.`} ${notes.length ? "User corrections and context are separately labelled in this report; the published-reporting score remains unchanged." : "No user corrections were added."}` };
  }
  async function buildReport() {
    if (!report || busy || !saved.email) return;
    const started = performance.now();
    setBusy("email"); setError(""); setGeneration([]); setGenerationReady(false); go("generating"); event("full_report_generation_started");
    try {
      const data = await post("/api/readiness/report-email", { sessionId: saved.sessionId, email: saved.email, name: saved.name, role: saved.role, shareRequestWithMsi: true, organisation: saved.candidate?.name, result: resultWithContext(report), impactMode: false });
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
    if (saved.step === "find") go("intro");
    else if (saved.step === "homework" || saved.step === "non-sorp") go("find");
    else if (saved.step === "quick") go("homework");
    else if (saved.step === "method") go("quick");
    else if (saved.step === "criterion") { if (saved.criterion === 0) go("method"); else setSaved(state => ({ ...state, criterion: state.criterion - 1 })); }
    else if (saved.step === "complete") go("criterion");
    else if (saved.step === "report") { if (saved.reportView === 0) go("complete"); else setSaved(state => ({ ...state, reportView: state.reportView - 1 })); }
    else if (saved.step === "support") { setCheckout(null); go("next"); }
    else if (saved.step === "next") go("report");
  }

  function guide() {
    const identity = saved.candidate && <div className="scr-guide-identity"><strong>{saved.candidate.name}</strong><span>Charity no. {saved.candidate.registrationNumber}</span></div>;
    if (saved.step === "intro") return <><p className="scr-kicker">WHY THIS MATTERS</p><h2>SORP 2026 raises the bar.</h2><p>Compliance matters — but better information should also help you make better decisions and improve impact.</p></>;
    if (saved.step === "find") return <><p className="scr-kicker">WHAT WE’RE CHECKING</p><h2>The right organisation. The right requirements.</h2><p>SORP requirements depend on the legal entity and its reporting basis. We check those first, so we assess the right charity against the right requirements.</p>{saved.research?.candidates.length ? <p className="scr-guide-note">Select the registered organisation that matches your charity.</p> : null}</>;
    if (saved.step === "homework") return <><p className="scr-kicker">WHAT HAPPENS NEXT</p><h2>We’ve done the public homework.</h2>{identity}<p>We’ll assess your published reporting against 15 areas mapped to SORP 2026. You’ll see the result first — then exactly how we arrived at it.</p></>;
    if (saved.step === "quick-generating") return <><p className="scr-kicker">HOW THIS WORKS</p><h2>Source to score.</h2>{identity}<ol className="scr-rail-flow"><li>SORP 2026</li><li>15 assessment areas</li><li>Published evidence</li><li>Fixed score</li></ol><p>The assessment is being built from your published report.</p></>;
    if (saved.step === "quick") return <><p className="scr-kicker">WHAT THIS SCORE MEANS</p><h2>A view of what was published.</h2>{identity}{tar && <div className="scr-guide-score"><small>PUBLISHED REPORTING</small><strong>{tar.score ?? "—"}<em>/100</em></strong><span className={tar.confidence === "LOW" ? "is-uncertain" : ""}>Confidence: {tar.confidence}</span></div>}<p>This score is based only on your latest published Trustees’ Annual Report and accounts. It does not tell us everything about where your organisation is today.</p></>;
    if (saved.step === "method") return <><p className="scr-kicker">WHY REVIEW THE 15 AREAS?</p><h2>Check our work.</h2>{identity}<p>See the SORP basis and the published evidence behind each assessment. You can agree, correct us or add current context; the historic score stays intact.</p></>;
    if (saved.step === "criterion") return <><p className="scr-kicker">YOUR PROGRESS</p><h2>{reviewedCount} of 15 reviewed.</h2><div className="scr-rail-meter"><span style={{ width: `${reviewedCount / 15 * 100}%` }} /></div><ol className="scr-rail-areas">{areaLabels.map((label, index) => <li key={label} className={index === saved.criterion ? "is-current" : index < saved.criterion || saved.corrections[String(index + 1)]?.reviewed ? "is-reviewed" : ""}><span>{saved.corrections[String(index + 1)]?.reviewed ? "✓" : index + 1}</span>{label}</li>)}</ol><p className="scr-guide-note">{saved.criterion < 5 ? "Good impact reporting starts with information you can use throughout the year." : saved.criterion < 10 ? "MUST is required. SHOULD is recommended. MAY is optional. MSI judgement is labelled separately." : "Better evidence supports better decisions, not just a stronger annual report."}</p></>;
    if (saved.step === "complete") return <><p className="scr-kicker">REVIEW COMPLETE</p><h2>Two views, kept separate.</h2><p>✓ What your published reporting showed</p><p>✓ What you told us about current practice</p><p className="scr-guide-note">Your corrections never rewrite the original published-reporting score.</p></>;
    if (saved.step === "generating") return <><p className="scr-kicker">YOUR PERSONALISED REPORT</p><h2>Published evidence, then your view.</h2><p>We’re bringing your 15 reviewed areas and any context together without changing the historical assessment.</p></>;
    if (saved.step === "report") return <><p className="scr-kicker">REPORT {saved.reportView + 1} OF 4</p><h2>{["Where you stand", "How we assessed you", "What you told us", "What to do next"][saved.reportView]}</h2>{identity}<p>{["Compare the historic published score with your current self-reported view.", "Inspect each SORP-mapped assessment and its evidence.", "See your corrections and context separately from MSI’s original view.", "Focus on the priorities that matter most next."][saved.reportView]}</p></>;
    if (saved.step === "next" || saved.step === "support") return <><p className="scr-kicker">HOW MSI CAN HELP</p><h2>Reporting is part of a bigger picture.</h2>{identity}<p>Get ready for SORP, strengthen the evidence and learning behind it, and communicate your impact responsibly.</p>{saved.step === "support" && <p className="scr-guide-note">Your report is already yours. Supporting this free tool is optional.</p>}</>;
    return <><p className="scr-kicker">THE RIGHT ENTITY</p><h2>Let’s check the charity record.</h2><p>A non-charity entity should not be assessed as if SORP applies to it.</p></>;
  }

  if (!loaded) return <main className="sorp-conversation-page scr-page"><p className="scr-loading">Opening your SORP review…</p></main>;
  return <main className="sorp-conversation-page scr-page">
    <header className="sorp-workspace-brand"><Link href="/are-you-sorp-ready"><span>My Social Impact</span><strong>Are You SORP Ready?</strong></Link><div className="sorp-workspace-brand-meta"><p>SORP is the requirement.<br /><strong>Better impact is the opportunity.</strong></p></div></header>
    <div className="scr-top"><div><small>{BUILD}</small><h2>{phases[phase]}</h2></div><nav aria-label="Review progress">{phases.map((label, index) => <span key={label} className={index === phase ? "is-current" : index < phase ? "is-complete" : ""}><i>{index < phase ? "✓" : index + 1}</i><b>{label}</b></span>)}</nav></div>
    <div className="scr-workspace"><aside className="scr-guide">{guide()}</aside>
      <section className="scr-main" aria-live="polite">
        {milestone && <div className="scr-milestone" role="status">{milestone}</div>}
        {saved.step === "intro" && <><p className="scr-kicker">SORP 2026 IS NOW IN EFFECT</p><h1>Are you SORP ready?</h1><p className="scr-lead">For relevant charities, SORP 2026 applies to reporting periods beginning on or after 1 January 2026.</p><div className="scr-philosophy">SORP IS THE REQUIREMENT.<br /><strong>BETTER IMPACT IS THE OPPORTUNITY.</strong></div><p>Getting ready is not just about writing a better annual report at year-end. Good impact reporting starts with useful information, evidence and learning in place throughout the year.</p><p>We’ll review your latest published Trustees’ Annual Report and accounts, show you what looks strong, where the gaps are and what to focus on next.</p></>}
        {saved.step === "find" && <><p className="scr-kicker">01 / FIND YOUR CHARITY</p><h1>Let’s find the right charity.</h1><p>Enter the charity’s name or registration number. We’ll confirm the legal entity and published documents before assessing anything.</p><form onSubmit={find} className="scr-find"><label htmlFor="scr-query">Charity name or number</label><input id="scr-query" value={saved.query} onChange={e => setSaved(state => ({ ...state, query: e.target.value }))} placeholder="e.g. The Brain Trust Limited"/><button type="submit" disabled={!!busy || !saved.query.trim()}>{busy === "find" ? "SEARCHING THE REGISTER…" : "FIND MY CHARITY →"}</button></form>{busy && <div className="scr-search-progress" role="status"><h2>Finding your charity…</h2><ProgressSequence items={["Looking for the registered organisation", "Confirming the legal entity", "Finding the latest published accounts", "Checking the reporting period", "Checking whether SORP applies", "Identifying the reporting tier", "Locating the Trustees’ Annual Report"]} complete={busy === "profile" ? 2 : 0} active={busy === "profile" ? Math.min(2 + progressClock % 5, 6) : 0}/><p className="scr-muted">We’ll only mark a step complete when the source confirms it.</p></div>}{saved.research && !busy && <div className="scr-results"><h2>{saved.research.candidates.length ? "Registered organisation found ✓" : "We need one more clue."}</h2>{saved.research.candidates.map(candidate => <article key={`${candidate.registrationNumber}-${candidate.name}`}><div><strong>{candidate.name}</strong><p>{candidate.locality} · {candidate.registrationNumber || candidate.entityType}</p></div><button onClick={() => void confirm(candidate)} disabled={!!busy}>YES — THIS IS MY CHARITY →</button></article>)}{!saved.research.candidates.length && <p>Try the registered charity number, a different legal name or a location.</p>}</div>}</>}
        {saved.step === "homework" && <><p className="scr-kicker">WE FOUND YOU ✓</p><h1>We found your published reporting.</h1><div className="scr-confirmed"><p>✓ Registered charity found</p>{saved.candidate?.reportUrl && <p>✓ Trustees’ Annual Report and accounts found</p>}{saved.candidate?.reportPeriod && <p>✓ Reporting period confirmed</p>}</div><p className="scr-lead">This review is based on your latest published Trustees’ Annual Report and accounts.</p><div className="scr-fact"><span>Organisation</span><strong>{saved.candidate?.name}</strong></div><div className="scr-fact"><span>Registered charity</span><strong>{saved.candidate?.registrationNumber || "Check the record"}</strong></div><div className="scr-fact"><span>Accounts / TAR</span><strong>{saved.candidate?.reportTitle || "Latest published accounts and report"}</strong></div><div className="scr-fact"><span>Reporting period</span><strong>{saved.candidate?.reportPeriod || "Still to confirm"}</strong></div><div className="scr-fact"><span>Accounting basis</span><strong>{saved.candidate?.accountingBasis === "accruals" ? "Accruals accounts" : saved.candidate?.accountingBasis === "receipts" ? "Receipts and payments" : "Not yet established"}</strong></div><div className="scr-fact"><span>Reporting tier</span><strong>{reportingTier}</strong></div><div className="scr-fact"><span>SORP applicability</span><strong>{saved.candidate?.entityType === "registered_charity" ? "SORP 2026 applies to relevant future reporting periods" : "Confirm legal status before assessment"}</strong></div><p>We’ll use your email to save your review and send you your personalised PDF report.</p><form id="scr-email-form" onSubmit={review} className="scr-fields"><label>Email — required<input required type="email" value={saved.email} onChange={e => setSaved(state => ({ ...state, email: e.target.value }))} /></label><label>Name — optional<input value={saved.name} onChange={e => setSaved(state => ({ ...state, name: e.target.value }))} /></label><label>Role — optional<input value={saved.role} onChange={e => setSaved(state => ({ ...state, role: e.target.value }))} /></label></form></>}
        {saved.step === "quick-generating" && <><p className="scr-kicker">BUILDING YOUR QUICK REVIEW</p><h1>Reading what your report shows.</h1><ProgressSequence items={quickSteps} complete={generation.length} active={generationReady ? Math.min(generation.length, quickSteps.length - 1) : progressClock % quickSteps.length}/><div className="scr-progress-message" role="status">{quickMessages[progressClock % quickMessages.length]}</div><p className="scr-muted">Completed ticks appear only after the assessment has returned.</p></>}
        {saved.step === "quick" && tar && <><p className="scr-kicker">YOUR QUICK REVIEW IS READY ✓</p><h1>Your published-reporting readiness.</h1><div className="scr-result"><strong>{tar.score ?? "—"}<small>/100</small></strong><div><b className={tar.score === null ? "is-unknown" : ""}>{band(tar.score)}</b><p>Evidence confidence: {tar.confidence}</p></div></div><p>This score is based on what we could establish from your latest published Trustees’ Annual Report and accounts.</p><div className="scr-columns"><div><h2>What looks strong</h2>{strong.length ? strong.map(f => <p key={f.fieldId}>{f.finding}</p>) : <p>No clear strengths could be established from the material inspected.</p>}</div><div><h2>Most important gaps</h2>{gaps.length ? gaps.map(f => <p key={f.fieldId}>{f.finding}</p>) : <p>No material gaps were identified in the inspected material.</p>}</div></div><h2>What to focus on</h2><ol>{priorities.map(f => <li key={f.fieldId}>{f.action}</li>)}</ol></>}
        {saved.step === "method" && <><p className="scr-kicker">HOW WE ARRIVED AT YOUR SCORE</p><h1>A source you can inspect. A score you can understand.</h1><div className="scr-method-flow"><div><b>01</b><strong>SORP 2026</strong><span>Our source of truth.</span></div><div><b>02</b><strong>15 assessment areas</strong><span>Mapped to relevant requirements and guidance.</span></div><div><b>03</b><strong>Your published evidence</strong><span>AI helps interpret what your TAR and accounts show.</span></div><div><b>04</b><strong>Fixed scoring method</strong><span>The score is calculated consistently from those assessments.</span></div></div><div className="scr-method-legend"><span>MUST</span><span>SHOULD</span><span>MAY</span><span>MSI / HUMAN JUDGEMENT</span></div><h2>Want to check us?</h2><p>Open <strong>SEE THE SORP BASIS</strong> on any assessment to view the relevant SORP paragraphs and published evidence.</p><p>We’ve already answered all 15 from your published report. You can review them, disagree or add current context where the report doesn’t tell the whole story. Your published score remains unchanged.</p></>}
        {saved.step === "criterion" && current && <><p className="scr-kicker">AREA {saved.criterion + 1} OF 15 · {classificationLabel(current.finding.classification)}</p><div className="scr-area-progress" aria-label={`${reviewedCount} of 15 areas reviewed`}>{areaLabels.map((label, index) => <span key={label} className={saved.corrections[String(index + 1)]?.reviewed ? "is-reviewed" : index === saved.criterion ? "is-current" : ""} />)}</div><h1>{current.question.question}</h1><p className="scr-subhead">MSI’S PUBLISHED-REPORT ASSESSMENT</p><strong className={`scr-assessment ${current.finding.answer === "not_sure" || current.finding.confidence === "LOW" ? "is-uncertain" : ""}`}>{scale.find(item => item.value === current.finding.answer)?.label}</strong><p>{current.finding.reason}</p><p className="scr-confidence">Evidence confidence: {current.finding.confidence}</p><details className="scr-details"><summary>SEE THE SORP BASIS · EVIDENCE &amp; SOURCES <span>+</span></summary><FindingSource finding={current.finding} /></details><p className="scr-subhead">DOES THAT LOOK RIGHT?</p><p className="scr-muted">Keep MSI’s published-report view, or choose a different current view. Your answer is labelled separately.</p><div className="scr-answer-grid">{scale.map(option => { const selected = correction?.answer === option.value; const suggested = current.finding.answer === option.value; return <button type="button" key={option.value} aria-pressed={selected || suggested && !correction?.answer} onClick={() => updateCorrection({ answer: suggested ? undefined : option.value })} className={`${selected ? "is-selected" : ""} ${suggested ? "is-suggested" : ""} ${suggested && option.value === "not_sure" ? "is-uncertain" : ""}`}><span>{option.label}{suggested && <small>MSI VIEW</small>}{selected && <small>YOUR CURRENT VIEW</small>}</span><span>{selected ? "✓" : "→"}</span></button>; })}</div><label className="scr-context" htmlFor="scr-context">ADD CONTEXT OR TELL US WHY YOU DISAGREE<textarea id="scr-context" value={correction?.context || ""} onChange={e => updateCorrection({ context: e.target.value })} rows={3} maxLength={4000} placeholder="Optional — what should we know?" /></label><div className="scr-context-actions"><button type="button" className="scr-clear" disabled={!correction?.context?.trim() || correction.savedContext === correction.context} onClick={() => updateCorrection({ savedContext: correction?.context || "" })}>SAVE MY CONTEXT</button>{correction?.context?.trim() && correction.savedContext === correction.context && <span role="status">✓ CONTEXT SAVED</span>}</div>{(correction?.answer || correction?.savedContext) && <div className="scr-current-view"><p><b>MSI’s published-report assessment:</b> {scale.find(item => item.value === current.finding.answer)?.label}</p><p><b>Your current view:</b> {scale.find(item => item.value === (correction?.answer || current.finding.answer))?.label}</p>{correction?.savedContext && <p><b>Your context:</b> {correction.savedContext}</p>}</div>}{correction?.answer && <button type="button" className="scr-clear" onClick={() => updateCorrection({ answer: undefined })}>KEEP MSI’S ORIGINAL ASSESSMENT</button>}</>}
        {saved.step === "complete" && <><p className="scr-kicker">15 OF 15 COMPLETE ✓</p><h1>Thank you — that helps.</h1><p className="scr-lead">We now have two different views:</p><div className="scr-confirmed"><p>✓ What your published reporting showed</p><p>✓ Where you say things stand now</p></div><p>We’ll keep those clearly distinguished in your personalised report.</p><p className="scr-muted">We’ll compare your published-report score with your current self-reported view.</p></>}
        {saved.step === "generating" && <><p className="scr-kicker">BUILDING YOUR PERSONALISED REPORT</p><h1>Bringing your review together.</h1><ProgressSequence items={reportSteps} complete={generation.length} active={generationReady ? Math.min(generation.length, reportSteps.length - 1) : progressClock % reportSteps.length}/><div className="scr-progress-message" role="status">{reportMessages[progressClock % reportMessages.length]}</div></>}
        {saved.step === "report" && report && <>
          <p className="scr-kicker">✓ YOUR PERSONALISED REPORT IS READY · REPORT {saved.reportView + 1} OF 4</p>
          {saved.emailSent && <p className="scr-mail">✓ YOUR PERSONALISED PDF HAS BEEN EMAILED TO: <strong>{saved.email}</strong></p>}
          {saved.reportView === 0 && <>
            <h1>Where you stand.</h1>
            <div className="scr-score-comparison">
              <div><small>PUBLISHED-REPORTING SCORE</small><strong>{tar?.score ?? "—"}<em>/100</em></strong><p>Based only on the latest published TAR and accounts.</p></div>
              <span aria-hidden="true">VS</span>
              <div><small>YOUR CURRENT VIEW · SELF-REPORTED</small><strong>{currentScore ?? "—"}<em>{currentScore === null ? "" : "/100"}</em></strong><p>Based on the 15 answers you reviewed; not independently verified.</p></div>
            </div>
            {currentScore === null ? <p className="scr-muted">There are not enough reviewed current answers to calculate a meaningful second score. We will not invent one.</p> : <p className="scr-score-explanation">{scoreDifference === null ? "The published-reporting score was unavailable, so there is no numerical comparison." : scoreDifference === 0 ? "Your current self-reported view matches the published-reporting score." : `Your current self-reported view is ${scoreDifference > 0 ? "+" : ""}${scoreDifference} points compared with what was published.`} This does not change what was historically published.</p>}
            <div className="scr-columns"><div><h2>What looks strong</h2>{strong.map(f => <p key={f.fieldId}>{f.finding}</p>)}</div><div><h2>Most important gaps</h2>{gaps.map(f => <p key={f.fieldId}>{f.finding}</p>)}</div></div>
            <h2>Top priorities</h2><ol>{priorities.map(f => <li key={f.fieldId}>{f.action}</li>)}</ol>
          </>}
          {saved.reportView === 1 && <>
            <h1>How we assessed you.</h1><p>These are MSI’s original assessments of the published TAR and accounts. Your later input does not change the historical score.</p>
            <div className="scr-report-list">{questions.map(({ question, finding }) => <details key={question.id}><summary><span>{String(question.id).padStart(2, "0")} · {question.question}</span><b>{scale.find(item => item.value === finding.answer)?.label}</b></summary><p>{finding.reason}</p><FindingSource finding={finding} /></details>)}</div>
          </>}
          {saved.reportView === 2 && <>
            <h1>What you told us.</h1><p>Your corrections and context are user-supplied, not independently verified, and did not change the published-reporting score.</p>
            {questions.filter(({ question }) => { const value = saved.corrections[String(question.id)]; return Boolean(value?.answer || value?.savedContext?.trim()); }).length
              ? questions.filter(({ question }) => { const value = saved.corrections[String(question.id)]; return Boolean(value?.answer || value?.savedContext?.trim()); }).map(({ question, finding }) => { const value = saved.corrections[String(question.id)]; return <article className="scr-user-note" key={question.id}><h2>{question.id}. {question.question}</h2><p><b>MSI’s published-report assessment:</b> {scale.find(item => item.value === finding.answer)?.label}</p><p><b>Your current view:</b> {scale.find(item => item.value === (value.answer || finding.answer))?.label}</p>{value.savedContext && <p><b>Your context:</b> {value.savedContext}</p>}</article>; })
              : <p>You reviewed the 15 areas without adding corrections or context. The published-evidence assessment stands on its own.</p>}
          </>}
          {saved.reportView === 3 && <>
            <h1>What to do next.</h1><p>These priorities can strengthen future statutory reporting and the impact information behind it.</p>
            <ol className="scr-actions">{priorities.map(f => <li key={f.fieldId}><strong>{f.action}</strong><p>{f.reason}</p></li>)}</ol>
            <p className="scr-muted">This is a published-evidence readiness review, not a certification of full SORP compliance or an independently verified view of current practice.</p>
          </>}
        </>}
        {saved.step === "next" && <><p className="scr-kicker">WHAT NEXT?</p><h1>Your Trustees’ Annual Report is only part of the picture.</h1><p>SORP allows charities to include or refer to useful wider information such as impact assessments, annual reviews and websites. Those materials do not replace required statutory reporting, but can provide additional evidence and context.</p><div className="scr-next-list"><article><small>01</small><div><h2>Get ready</h2><p>Understand SORP requirements and strengthen your reporting.</p></div></article><article><small>02</small><div><h2>Get better</h2><p>Improve the evidence, systems and learning behind reporting. We can review your Social Impact Report, wider published evidence, current evidence and impact data systems.</p></div></article><article><small>03</small><div><h2>Get excellent</h2><p>Social Impact Excellence: stronger organisation-wide practice across Purpose, Leadership, Data, Delivery and Communications.</p></div></article><article><small>04</small><div><h2>Communicate responsibly</h2><p>Social Impact Claims Code: evidence-based, proportionate, transparent, balanced and learning-oriented public claims.</p></div></article></div><div className="scr-philosophy">SORP IS THE REQUIREMENT.<br /><strong>BETTER IMPACT IS THE OPPORTUNITY.</strong></div><h2>Want to talk through what this means for your charity?</h2><a className="scr-link-action" href="mailto:marcus@mysocialimpact.org?subject=SORP%202026%20review" onClick={() => event("book_conversation_clicked")}>TALK TO MY SOCIAL IMPACT →</a></>}
        {saved.step === "support" && <><p className="scr-kicker">OPTIONAL CONTRIBUTION</p><h1>Help us keep this free.</h1><p className="scr-lead">If this helped, £5 — or whatever you can afford — helps us keep building and running free tools, especially for smaller charities.</p>{saved.supportPaid ? <p className="scr-mail">THANK YOU — THAT GENUINELY HELPS ✓</p> : checkout ? <><SorpPublicSupportCheckout clientSecret={checkout.clientSecret} sessionId={checkout.sessionId} onPaid={() => { setSaved(state => ({ ...state, supportPaid: true })); setCheckout(null); }}/><button type="button" className="scr-clear" onClick={() => setCheckout(null)}>CLOSE PAYMENT</button></> : <><div className="scr-amounts">{([5, 10, 20, "other"] as const).map(amount => <button key={amount} type="button" aria-pressed={support === amount} onClick={() => setSupport(amount)}>{amount === "other" ? "OTHER" : `£${amount}`}</button>)}</div>{support === "other" && <label className="scr-context">Amount in pounds<input inputMode="decimal" value={custom} onChange={e => setCustom(e.target.value)} /></label>}<p className="scr-muted">Your free report is already yours. This contribution is entirely optional.</p></>}</>}
        {saved.step === "non-sorp" && <><p className="scr-kicker">LEGAL STATUS CHECK</p><h1>We need to pause this SORP review.</h1><p>The entity identified is not a registered charity. Please check the legal entity and charity number before we assess SORP applicability.</p></>}
        {error && <div className="scr-error" role="alert">{error}</div>}
      </section></div>
    <footer className="scr-bottom">
      <div><button type="button" className="scr-back" disabled={saved.step === "intro" || !!busy} onClick={back}>← BACK</button><span>{saved.candidate?.name || "Published-reporting review"}</span></div>
      <div>
        {saved.step === "intro" && <button onClick={() => go("find")}>CHECK MY CHARITY <span>→</span></button>}
        {saved.step === "homework" && <button type="submit" form="scr-email-form" disabled={!!busy || !saved.email.trim()}>BUILD MY FREE REVIEW <span>→</span></button>}
        {saved.step === "quick-generating" && <span className="scr-bottom-status">Building your Quick Review…</span>}
        {saved.step === "quick" && <button onClick={() => { go("method"); event("snapshot_viewed"); }}>SEE EXACTLY HOW WE SCORED YOU <span>→</span></button>}
        {saved.step === "method" && <button onClick={() => { go("criterion"); event("guided_conversation_started"); }}>REVIEW MY 15 AREAS <span>→</span></button>}
        {saved.step === "criterion" && <button onClick={nextCriterion}>{saved.criterion === 14 ? "FINISH MY 15-AREA REVIEW" : correction?.answer ? "SAVE MY CURRENT VIEW & NEXT AREA" : "AGREE & NEXT AREA"}<span>→</span></button>}
        {saved.step === "complete" && <button onClick={() => void buildReport()} disabled={!!busy}>BUILD MY PERSONALISED REPORT <span>→</span></button>}
        {saved.step === "generating" && <span className="scr-bottom-status">Preparing your personalised report…</span>}
        {saved.step === "report" && <button onClick={() => { if (saved.reportView < 3) setSaved(state => ({ ...state, reportView: state.reportView + 1 })); else { go("next"); event("support_ask_viewed"); } }}>{["NEXT: HOW WE ASSESSED YOU", "NEXT: WHAT YOU TOLD US", "NEXT: WHAT TO DO NEXT", "EXPLORE WHAT COMES NEXT"][saved.reportView]}<span>→</span></button>}
        {saved.step === "next" && <button onClick={() => go("support")}>HELP US KEEP THIS FREE <span>→</span></button>}
        {saved.step === "support" && (saved.supportPaid || checkout ? <button onClick={() => { setCheckout(null); go("next"); }}>BACK TO WHAT NEXT <span>→</span></button> : <><button className="is-secondary" onClick={() => go("next")}>NOT NOW</button><button disabled={!!busy || !supportPence(support, custom)} onClick={() => void contribute()}>{busy === "support" ? "OPENING PAYMENT…" : "CONTRIBUTE SECURELY"}<span>→</span></button></>)}
        {saved.step === "non-sorp" && <button onClick={() => go("find")}>SEARCH ANOTHER CHARITY <span>→</span></button>}
      </div>
    </footer>
  </main>;
}
