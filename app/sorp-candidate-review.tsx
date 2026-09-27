"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { coreQuestions, answerOptions, type AnswerValue } from "./sorp-questionnaire";
import { trackSorpEvent } from "./sorp-growth";
import { supportPence, type SupportChoice } from "./sorp-payment-amounts";
import { SorpPublicSupportCheckout } from "./sorp-public-support-checkout";
import { band, classificationLabel, emailResult, emptyLens, highlights, type Candidate, type Finding, type Intelligence, type Lens, type Report, type Research } from "./sorp-public-model";
import "./sorp-candidate-review.css";

type Step = "intro" | "find" | "homework" | "quick" | "method" | "criterion" | "complete" | "generating" | "report" | "next" | "support" | "non-sorp";
type Correction = { answer?: AnswerValue; context: string; reviewed: boolean };
type Saved = { sessionId: string; step: Step; query: string; research: Research | null; candidate: Candidate | null; state: unknown; intelligence: Intelligence | null; report: Report | null; email: string; name: string; role: string; criterion: number; corrections: Record<string, Correction>; reportView: number; emailSent: boolean; supportPaid: boolean };
const KEY = "msi-sorp-final-candidate-v1";
const BUILD = "REVIEW-1 · 27 SEPTEMBER 2026";
const SORP_SOURCE = "https://www.charitysorp.org/documents/d/guest/charities-sorp-2026-1";
const initial: Saved = { sessionId: "", step: "intro", query: "", research: null, candidate: null, state: null, intelligence: null, report: null, email: "", name: "", role: "", criterion: 0, corrections: {}, reportView: 0, emailSent: false, supportPaid: false };
const phases = ["Find charity", "Public homework", "Quick review", "15 areas", "Your report", "What next"];
const scale = answerOptions.map(({ value, label }) => ({ value, label: label.toUpperCase() }));
const phaseFor = (step: Step) => step === "intro" || step === "find" ? 0 : step === "homework" ? 1 : step === "quick" ? 2 : step === "method" || step === "criterion" || step === "complete" ? 3 : step === "generating" || step === "report" ? 4 : 5;
const safeLink = (url: string) => /^https:\/\//.test(url) ? url : "";

async function post(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error || "That step could not be completed. Please try again.");
  return data;
}

function FindingSource({ finding }: { finding: Finding }) {
  return <div className="scr-sources"><p><strong>Published evidence</strong> {finding.excerpt || "We could not establish this from the inspected statutory reporting. That is not proof the practice is absent."}</p>{safeLink(finding.sourceUrl) && <a href={finding.sourceUrl} target="_blank" rel="noreferrer">View published source ↗</a>}<p><strong>SORP basis</strong> {classificationLabel(finding.classification)}{["JUDGEMENT", "MSI_READINESS"].includes(finding.classification) ? " — MSI judgement is not an official SORP category." : ""}</p>{finding.sources.map(source => <p key={`${source.reference}-${source.page}`}><a href={`${SORP_SOURCE}#page=${source.page}`} target="_blank" rel="noreferrer">SORP 2026 · {source.reference} · p.{source.page} ↗</a><br />{source.text}</p>)}</div>;
}

export function SorpCandidateReview() {
  const [saved, setSaved] = useState<Saved>(initial);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [generation, setGeneration] = useState<string[]>([]);
  const [support, setSupport] = useState<SupportChoice>(5);
  const [custom, setCustom] = useState("");
  const [checkout, setCheckout] = useState<{ clientSecret: string; sessionId: string } | null>(null);

  useEffect(() => {
    try { const stored = JSON.parse(localStorage.getItem(KEY) || "null"); setSaved(stored?.sessionId ? { ...initial, ...stored, step: stored.step === "generating" ? "complete" : stored.step } : { ...initial, sessionId: crypto.randomUUID() }); }
    catch { setSaved({ ...initial, sessionId: crypto.randomUUID() }); setError("This browser could not restore a saved review. Please keep this page open until your PDF arrives."); }
    setLoaded(true);
  }, []);
  useEffect(() => { if (loaded) { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch { setError("This browser could not save your progress. Please keep the page open until your PDF arrives."); } } }, [saved, loaded]);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [saved.step, saved.criterion, saved.reportView]);
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
    setBusy("tar"); setError(""); event("email_captured");
    try {
      const data = await post("/api/published-review", { operation: "tar", candidate: saved.candidate, state: saved.state, sessionId: saved.sessionId, intelligencePin: saved.intelligence });
      const lens = data.lens as Lens;
      const next: Report = { candidate: saved.candidate, tar: lens, wider: emptyLens("wider", "Wider evidence was deliberately not assessed in this published-reporting review."), createdAt: new Date().toISOString(), intelligence: saved.intelligence };
      setSaved(state => ({ ...state, report: next, email: state.email.trim(), step: saved.candidate?.entityType === "registered_charity" ? "quick" : "non-sorp" }));
      event("public_research_completed", { readinessScore: lens.score ?? undefined, evidenceConfidence: lens.confidence }); event("quick_review_reached"); event("tar_score", { readinessScore: lens.score ?? undefined });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The statutory review could not finish. Please retry."); }
    finally { setBusy(""); }
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
    if (saved.criterion === 14) event("guided_conversation_completed");
  }
  function resultWithContext(value: Report) {
    const result = emailResult(value);
    const notes = questions.flatMap(({ question, finding }) => {
      const user = saved.corrections[String(question.id)];
      if (!user?.answer && !user?.context.trim()) return [];
      return [`Criterion ${question.id}: MSI published-evidence assessment was ${scale.find(item => item.value === finding.answer)?.label || finding.answer}. ${user.answer ? `User correction: ${scale.find(item => item.value === user.answer)?.label || user.answer}.` : ""} ${user.context.trim() ? `User context: ${user.context.trim()}` : ""} User-supplied, not independently verified and not used to change the TAR-only score.`];
    });
    return { ...result, priorities: priorities.map(priorityText), must: value.tar.findings.filter(finding => finding.classification === "MUST" && finding.answer !== "yes").map(priorityText), userConfirmedPractice: notes,
      publishedEvidence: { ...result.publishedEvidence, traceability: [...result.publishedEvidence.traceability, ...notes.map((note, index) => ({ title: `User-supplied context ${index + 1} — not used in the published-evidence score`, detail: note }))] },
      overview: `${result.overview} ${notes.length ? "User corrections and context are separately labelled in this report; the published-reporting score remains unchanged." : "No user corrections were added."}` };
  }
  async function buildReport() {
    if (!report || busy || !saved.email) return;
    setBusy("email"); setError(""); setGeneration(["Reviewing your published Trustees’ Annual Report"]); go("generating"); event("full_report_generation_started");
    try {
      setGeneration(items => [...items, "Checking the relevant SORP requirements", "Bringing together the 15 assessment areas", "Adding any context or corrections you provided", "Prioritising what matters next"]);
      const data = await post("/api/readiness/report-email", { sessionId: saved.sessionId, email: saved.email, name: saved.name, role: saved.role, shareRequestWithMsi: true, organisation: saved.candidate?.name, result: resultWithContext(report), impactMode: false });
      if (!data.ok || !data.attachment?.endsWith(".pdf")) throw new Error("The full PDF was not confirmed as attached. Please retry.");
      setSaved(state => ({ ...state, emailSent: true, step: "report", reportView: 0 })); event("pdf_email_sent"); event("full_report_viewed");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Email failed. No success was confirmed."); setSaved(state => ({ ...state, step: "complete" })); }
    finally { setBusy(""); }
  }
  async function contribute() {
    const amountMinor = supportPence(support, custom);
    if (!amountMinor || busy) return; setBusy("support"); setError(""); event("support_payment_started", { amountMinor, currency: "GBP", paymentType: "voluntary_support" });
    try { const data = await post("/api/sorp-payments/checkout", { paymentType: "voluntary_support", presentation: "embedded", band: null, amountMinor, sessionId: saved.sessionId, organisation: saved.candidate?.name, email: saved.email, idempotencyKey: `${saved.sessionId}:support:${amountMinor}:${crypto.randomUUID()}` }); if (data.presentation !== "embedded" || !data.clientSecret || !data.id) throw new Error("Inline payment could not be opened. No payment was taken."); setCheckout({ clientSecret: data.clientSecret, sessionId: data.id }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Inline payment could not open. No payment was taken."); }
    finally { setBusy(""); }
  }

  if (!loaded) return <main className="sorp-conversation-page scr-page"><p className="scr-loading">Opening your SORP review…</p></main>;
  return <main className="sorp-conversation-page scr-page">
    <header className="sorp-workspace-brand"><Link href="/are-you-sorp-ready"><span>My Social Impact</span><strong>Are You SORP Ready?</strong></Link><div className="sorp-workspace-brand-meta"><p>SORP is the requirement.<br /><strong>Better impact is the opportunity.</strong></p></div></header>
    <div className="scr-top"><div><small>{BUILD}</small><h2>{phases[phase]}</h2></div><nav aria-label="Review progress">{phases.map((label, index) => <span key={label} className={index === phase ? "is-current" : index < phase ? "is-complete" : ""}><i>{index < phase ? "✓" : index + 1}</i><b>{label}</b></span>)}</nav></div>
    <div className="scr-workspace"><aside className="scr-guide"><p className="scr-kicker">{saved.candidate ? "YOUR CHARITY" : "THE REVIEW"}</p><h2>{saved.candidate?.name || "Published evidence first."}</h2>{saved.candidate ? <><p>{saved.candidate.registrationNumber && `Charity no. ${saved.candidate.registrationNumber}`}</p><p>{saved.candidate.reportTitle || "Latest published Trustees’ Annual Report and accounts"}</p><p>{saved.candidate.reportPeriod}</p>{safeLink(saved.candidate.reportUrl) && <a href={saved.candidate.reportUrl} target="_blank" rel="noreferrer">View report used ↗</a>}</> : <p>We’ll inspect the latest published Trustees’ Annual Report and accounts, then show you our reasoning criterion by criterion.</p>}{tar && <div className="scr-guide-score"><small>TAR READINESS</small><strong>{tar.score ?? "—"}<em>/100</em></strong><span>Confidence: {tar.confidence}</span></div>}<p className="scr-guide-note">This is a retrospective published-reporting review. It does not establish what your charity is doing today.</p></aside>
      <section className="scr-main" aria-live="polite">
        {saved.step === "intro" && <><p className="scr-kicker">SORP 2026 · IMPACT REPORTING</p><h1>Are you SORP ready?</h1><p className="scr-lead">SORP 2026 applies to relevant charities for reporting periods beginning on or after 1 January 2026. It raises the bar for impact reporting.</p><p>Getting ready is not simply about writing a better annual report at year-end. Good reporting starts with useful information, evidence and learning throughout the year.</p><div className="scr-philosophy">SORP IS THE REQUIREMENT.<br /><strong>BETTER IMPACT IS THE OPPORTUNITY.</strong></div><p>My Social Impact can help you understand what your latest published reporting does well, where the gaps are and what to focus on next.</p></>}
        {saved.step === "find" && <><p className="scr-kicker">01 / FIND YOUR CHARITY</p><h1>Let’s find the right charity.</h1><p>Enter the charity’s name or registration number. We’ll confirm the legal entity and published documents before assessing anything.</p><form onSubmit={find} className="scr-find"><label htmlFor="scr-query">Charity name or number</label><input id="scr-query" value={saved.query} onChange={e => setSaved(state => ({ ...state, query: e.target.value }))} placeholder="e.g. The Brain Trust Limited"/><button type="submit" disabled={!!busy || !saved.query.trim()}>{busy === "find" ? "SEARCHING…" : "FIND MY CHARITY →"}</button></form>{saved.research && <div className="scr-results"><h2>{saved.research.candidates.length ? "Is this your charity?" : "We need one more clue."}</h2>{saved.research.candidates.map(candidate => <article key={`${candidate.registrationNumber}-${candidate.name}`}><div><strong>{candidate.name}</strong><p>{candidate.locality} · {candidate.registrationNumber || candidate.entityType}</p></div><button onClick={() => void confirm(candidate)} disabled={!!busy}>{busy === "profile" ? "CHECKING…" : "YES — THIS IS MY CHARITY →"}</button></article>)}{!saved.research.candidates.length && <p>Try the registered charity number, a different legal name or a location.</p>}</div>}</>}
        {saved.step === "homework" && <><p className="scr-kicker">02 / PUBLIC HOMEWORK</p><h1>We found your published reporting.</h1><p className="scr-lead">THIS REVIEW IS BASED ON YOUR LATEST PUBLISHED TRUSTEES’ ANNUAL REPORT AND ACCOUNTS.</p><div className="scr-fact"><span>Organisation</span><strong>{saved.candidate?.name}</strong></div><div className="scr-fact"><span>Registered charity</span><strong>{saved.candidate?.registrationNumber || "Check the record"}</strong></div><div className="scr-fact"><span>Accounts / TAR</span><strong>{saved.candidate?.reportTitle || "Latest published accounts and report"}</strong></div><div className="scr-fact"><span>Reporting period</span><strong>{saved.candidate?.reportPeriod || "As shown in the filing"}</strong></div><p>We’ll use your email to save your review and send you your personalised PDF report.</p><form id="scr-email-form" onSubmit={review} className="scr-fields"><label>Email — required<input required type="email" value={saved.email} onChange={e => setSaved(state => ({ ...state, email: e.target.value }))} /></label><label>Name — optional<input value={saved.name} onChange={e => setSaved(state => ({ ...state, name: e.target.value }))} /></label><label>Role — optional<input value={saved.role} onChange={e => setSaved(state => ({ ...state, role: e.target.value }))} /></label></form></>}
        {saved.step === "quick" && tar && <><p className="scr-kicker">03 / QUICK REVIEW</p><h1>Your published-reporting readiness.</h1><div className="scr-result"><strong>{tar.score ?? "—"}<small>/100</small></strong><div><b>{band(tar.score)}</b><p>Evidence confidence: {tar.confidence}</p></div></div><p>This score is based on what we could establish from your latest published Trustees’ Annual Report and accounts.</p><div className="scr-columns"><div><h2>What looks strong</h2>{strong.length ? strong.map(f => <p key={f.fieldId}>{f.finding}</p>) : <p>No clear strengths could be established from the material inspected.</p>}</div><div><h2>Most important gaps</h2>{gaps.length ? gaps.map(f => <p key={f.fieldId}>{f.finding}</p>) : <p>No material gaps were identified in the inspected material.</p>}</div></div><h2>What to focus on</h2><ol>{priorities.map(f => <li key={f.fieldId}>{f.action}</li>)}</ol><p className="scr-muted">Next we’ll show you exactly how we arrived at it.</p></>}
        {saved.step === "method" && <><p className="scr-kicker">04 / HOW WE SCORED YOU</p><h1>How we arrived at your score.</h1><p className="scr-lead">We assessed your published reporting against 15 areas that matter for the impact-reporting aspects of SORP 2026.</p><p>We’ve already answered each one based on what we found in your report. You can simply review them — or correct us, disagree, or add context where the published report doesn’t tell the whole story.</p><p>What you tell us here can also provide useful context if you choose to talk to My Social Impact afterwards.</p><p className="scr-muted">Your published-reporting score stays separate from anything you tell us about current practice.</p></>}
        {saved.step === "criterion" && current && <><p className="scr-kicker">CRITERION {saved.criterion + 1} / 15 · {classificationLabel(current.finding.classification)}</p><h1>{current.question.question}</h1><p className="scr-subhead">MSI’S ASSESSMENT FROM THE PUBLISHED REPORT</p><strong className="scr-assessment">{scale.find(item => item.value === current.finding.answer)?.label}</strong><p>{current.finding.reason}</p><p className="scr-confidence">Evidence confidence: {current.finding.confidence}</p><details className="scr-details"><summary>WHY WE SAID THIS · EVIDENCE &amp; SORP BASIS <span>+</span></summary><FindingSource finding={current.finding} /></details><p className="scr-subhead">DOES THAT LOOK RIGHT?</p><p className="scr-muted">Leave MSI’s answer as it is, or choose a correction. Your input will be labelled separately.</p><div className="scr-answer-grid">{scale.map(option => { const selected = correction?.answer === option.value; const suggested = current.finding.answer === option.value; return <button type="button" key={option.value} aria-pressed={selected || suggested && !correction?.answer} onClick={() => updateCorrection({ answer: suggested ? undefined : option.value })} className={`${selected ? "is-selected" : ""} ${suggested ? "is-suggested" : ""}`}><span>{option.label}{suggested && <small>MSI VIEW</small>}{selected && <small>YOUR CORRECTION</small>}</span><span>{selected ? "✓" : "→"}</span></button>; })}</div><label className="scr-context" htmlFor="scr-context">ADD CONTEXT OR TELL US WHY YOU DISAGREE<textarea id="scr-context" value={correction?.context || ""} onChange={e => updateCorrection({ context: e.target.value })} rows={3} maxLength={4000} placeholder="Optional — what should we know?" /></label>{correction?.answer && <button type="button" className="scr-clear" onClick={() => updateCorrection({ answer: undefined })}>KEEP MSI’S ORIGINAL ASSESSMENT</button>}</>}
        {saved.step === "complete" && <><p className="scr-kicker">✓ 15 / 15 REVIEWED</p><h1>Thank you — that helps.</h1><p className="scr-lead">We now have two useful views: what your published reporting shows, and any additional context or corrections you have given us.</p><p>We’ll keep those clearly distinguished in your final report.</p><div className="scr-philosophy">SORP IS THE REQUIREMENT.<br /><strong>BETTER IMPACT IS THE OPPORTUNITY.</strong></div></>}
        {saved.step === "generating" && <><p className="scr-kicker">BUILDING YOUR REPORT</p><h1>Bringing your review together.</h1><ol className="scr-generation">{generation.map(item => <li key={item}>✓ {item}</li>)}</ol><div className="scr-philosophy">SORP IS THE REQUIREMENT.<br /><strong>BETTER IMPACT IS THE OPPORTUNITY.</strong></div><p>Good reporting matters. The wider opportunity is to build information, systems and learning that support better decisions throughout the year.</p></>}
        {saved.step === "report" && report && <><p className="scr-kicker">✓ YOUR REPORT IS READY · {saved.reportView + 1} / 4</p>{saved.emailSent && <p className="scr-mail">✓ YOUR PERSONALISED REPORT HAS BEEN EMAILED TO: <strong>{saved.email}</strong></p>}{saved.reportView === 0 && <><h1>Where you stand.</h1><div className="scr-result"><strong>{tar?.score ?? "—"}<small>/100</small></strong><div><b>{band(tar?.score ?? null)}</b><p>Evidence confidence: {tar?.confidence}</p></div></div><div className="scr-columns"><div><h2>What looks strong</h2>{strong.map(f => <p key={f.fieldId}>{f.finding}</p>)}</div><div><h2>Most important gaps</h2>{gaps.map(f => <p key={f.fieldId}>{f.finding}</p>)}</div></div><h2>Top priorities</h2><ol>{priorities.map(f => <li key={f.fieldId}>{f.action}</li>)}</ol></>}{saved.reportView === 1 && <><h1>How we assessed you.</h1><p>The original published-evidence assessment remains visible even if you corrected it. The score above is based only on the TAR/accounts.</p><div className="scr-report-list">{questions.map(({ question, finding }) => <details key={question.id}><summary><span>{String(question.id).padStart(2, "0")} · {question.question}</span><b>{scale.find(item => item.value === finding.answer)?.label}</b></summary><p>{finding.reason}</p><FindingSource finding={finding} /></details>)}</div></>}{saved.reportView === 2 && <><h1>What you told us.</h1><p>User-supplied context is not independently verified and has not changed the published-reporting score.</p>{questions.filter(({ question }) => { const c = saved.corrections[String(question.id)]; return Boolean(c?.answer || c?.context.trim()); }).length ? questions.filter(({ question }) => { const c = saved.corrections[String(question.id)]; return Boolean(c?.answer || c?.context.trim()); }).map(({ question, finding }) => { const c = saved.corrections[String(question.id)]; return <article className="scr-user-note" key={question.id}><h2>{question.id}. {question.question}</h2><p><b>MSI original:</b> {scale.find(item => item.value === finding.answer)?.label}</p>{c.answer && <p><b>Your correction:</b> {scale.find(item => item.value === c.answer)?.label}</p>}{c.context && <p><b>Your context:</b> {c.context}</p>}</article>; }) : <p>You did not add any corrections or context. That is fine — the published-evidence assessment stands on its own.</p>}</>}{saved.reportView === 3 && <><h1>What to do next.</h1><p>These priorities can strengthen both future statutory reporting and the underlying impact information and systems.</p><ol className="scr-actions">{priorities.map(f => <li key={f.fieldId}><strong>{f.action}</strong><p>{f.reason}</p></li>)}</ol><p className="scr-muted">This is a published-evidence readiness review, not a certification of full SORP compliance or a view of unpublished current practice.</p></>}</>}
        {saved.step === "next" && <><p className="scr-kicker">WHAT NEXT?</p><h1>Your Trustees’ Annual Report is only part of the picture.</h1><p>SORP allows charities to include or refer to useful wider information such as impact assessments, annual reviews and websites. Those materials do not replace required statutory reporting, but can provide additional evidence and context.</p><div className="scr-next-list"><article><small>01</small><div><h2>Get ready</h2><p>Understand SORP requirements and strengthen your reporting.</p></div></article><article><small>02</small><div><h2>Get better</h2><p>Improve the evidence, systems and learning behind reporting. We can review your Social Impact Report, wider published evidence, current evidence and impact data systems.</p></div></article><article><small>03</small><div><h2>Get excellent</h2><p>Social Impact Excellence: stronger organisation-wide practice across Purpose, Leadership, Data, Delivery and Communications.</p></div></article><article><small>04</small><div><h2>Communicate responsibly</h2><p>Social Impact Claims Code: evidence-based, proportionate, transparent, balanced and learning-oriented public claims.</p></div></article></div><div className="scr-philosophy">SORP IS THE REQUIREMENT.<br /><strong>BETTER IMPACT IS THE OPPORTUNITY.</strong></div><h2>Want to talk through what this means for your charity?</h2><a className="scr-link-action" href="mailto:marcus@mysocialimpact.org?subject=SORP%202026%20review" onClick={() => event("book_conversation_clicked")}>TALK TO MY SOCIAL IMPACT →</a></>}
        {saved.step === "support" && <><p className="scr-kicker">OPTIONAL CONTRIBUTION</p><h1>Help us keep this free.</h1><p className="scr-lead">If this helped, £5 — or whatever you can afford — helps us keep building and running free tools, especially for smaller charities.</p>{saved.supportPaid ? <p className="scr-mail">THANK YOU — THAT GENUINELY HELPS ✓</p> : checkout ? <><SorpPublicSupportCheckout clientSecret={checkout.clientSecret} sessionId={checkout.sessionId} onPaid={() => { setSaved(state => ({ ...state, supportPaid: true })); setCheckout(null); }}/><button type="button" className="scr-clear" onClick={() => setCheckout(null)}>CLOSE PAYMENT</button></> : <><div className="scr-amounts">{([5, 10, 20, "other"] as const).map(amount => <button key={amount} type="button" aria-pressed={support === amount} onClick={() => setSupport(amount)}>{amount === "other" ? "OTHER" : `£${amount}`}</button>)}</div>{support === "other" && <label className="scr-context">Amount in pounds<input inputMode="decimal" value={custom} onChange={e => setCustom(e.target.value)} /></label>}<p className="scr-muted">Your free report is already yours. This contribution is entirely optional.</p></>}</>}
        {saved.step === "non-sorp" && <><p className="scr-kicker">LEGAL STATUS CHECK</p><h1>We need to pause this SORP review.</h1><p>The entity identified is not a registered charity. Please check the legal entity and charity number before we assess SORP applicability.</p></>}
        {error && <div className="scr-error" role="alert">{error}</div>}
      </section></div>
    <footer className="scr-bottom"><div><button type="button" className="scr-back" disabled={saved.step === "intro" || !!busy} onClick={() => { if (saved.step === "find") go("intro"); else if (saved.step === "homework" || saved.step === "non-sorp") go("find"); else if (saved.step === "quick") go("homework"); else if (saved.step === "method") go("quick"); else if (saved.step === "criterion") { if (saved.criterion === 0) go("method"); else setSaved(state => ({ ...state, criterion: state.criterion - 1 })); } else if (saved.step === "complete") go("criterion"); else if (saved.step === "report") setSaved(state => ({ ...state, reportView: Math.max(0, state.reportView - 1) })); else if (saved.step === "support") go("next"); else if (saved.step === "next") go("report"); }}>← BACK</button><span>{saved.candidate?.name || "Published-reporting review"}</span></div><div>{saved.step === "intro" && <button onClick={() => go("find")}>CHECK MY CHARITY <span>→</span></button>}{saved.step === "homework" && <button type="submit" form="scr-email-form" disabled={!!busy || !saved.email.trim()}>{busy === "tar" ? "ASSESSING YOUR REPORT…" : "REVIEW MY PUBLISHED REPORT"}<span>→</span></button>}{saved.step === "quick" && <button onClick={() => { go("method"); event("snapshot_viewed"); }}>SHOW ME HOW <span>→</span></button>}{saved.step === "method" && <button onClick={() => { go("criterion"); event("guided_conversation_started"); }}>REVIEW THE 15 AREAS <span>→</span></button>}{saved.step === "criterion" && <button onClick={nextCriterion}>{saved.criterion === 14 ? "FINISH REVIEW" : "AGREE / CONTINUE"}<span>→</span></button>}{saved.step === "complete" && <button onClick={() => void buildReport()} disabled={!!busy}>{busy ? "BUILDING…" : "BUILD MY REPORT"}<span>→</span></button>}{saved.step === "report" && <button onClick={() => { if (saved.reportView < 3) setSaved(state => ({ ...state, reportView: state.reportView + 1 })); else { go("next"); event("support_ask_viewed"); } }}>{saved.reportView < 3 ? "CONTINUE" : "WHAT NEXT?"}<span>→</span></button>}{saved.step === "next" && <button onClick={() => go("support")}>HELP US KEEP THIS FREE <span>→</span></button>}{saved.step === "support" && (saved.supportPaid || checkout ? <button onClick={() => go("report")}>RETURN TO MY REPORT <span>→</span></button> : <><button className="is-secondary" onClick={() => go("report")}>NOT NOW</button><button disabled={!!busy || !supportPence(support, custom)} onClick={() => void contribute()}>{busy === "support" ? "OPENING PAYMENT…" : "CONTRIBUTE SECURELY"}<span>→</span></button></>)}{saved.step === "non-sorp" && <button onClick={() => go("find")}>SEARCH AGAIN <span>→</span></button>}</div></footer>
  </main>;
}
