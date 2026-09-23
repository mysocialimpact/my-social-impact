"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";

type ReviewBand = "small" | "medium" | "large";
type Choice = "review" | "support" | "free" | null;
type Usefulness = "very" | "somewhat" | "not_really" | null;
type Role = "" | "Trustee" | "CEO" | "Employee" | "Adviser" | "Other";
type ResultSummary = { score: number; band: string; confidence: "HIGH" | "MEDIUM" | "LOW"; overview: string; strong: string[]; attention: string[]; priorities: string[] };

const reviewBands: Array<{ id: ReviewBand; label: string; income: string; amount: number }> = [
  { id: "small", label: "Small charity", income: "Up to £500,000 income", amount: 50 },
  { id: "medium", label: "Medium charity", income: "£500,000–£15 million income", amount: 100 },
  { id: "large", label: "Large charity", income: "Over £15 million income", amount: 200 },
];

function eventId(sessionId: string, eventType: string, once = false) {
  return once ? `${sessionId}:${eventType}` : `${sessionId}:${eventType}:${crypto.randomUUID()}`;
}

async function track(sessionId: string, eventType: string, extras: Record<string, unknown> = {}, once = false) {
  if (!sessionId) return;
  const marker = `msi-growth:${sessionId}:${eventType}`;
  if (once && window.localStorage.getItem(marker)) return;
  if (once) window.localStorage.setItem(marker, "1");
  try {
    await fetch("/api/growth-event", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ eventId: eventId(sessionId, eventType, once), sessionId, eventType, ...extras }) });
  } catch { /* Analytics must never interrupt the free result. */ }
}

function suggestedBand(income: string): ReviewBand {
  if (income === "tier2") return "medium";
  if (income === "tier3") return "large";
  return "small";
}

function headline(items: string[], fallback: string) {
  return items.length ? items.slice(0, 3) : [fallback];
}

export function SorpResultActions({ sessionId, organisation, income, result, children, onBackToAssessment, startInReportMode = false }: { sessionId: string; organisation: string; income: string; result: ResultSummary; children: ReactNode; onBackToAssessment: () => void; startInReportMode?: boolean }) {
  const storageKey = `msi-sorp-report-mode:${sessionId}`;
  const [choice, setChoice] = useState<Choice>(null);
  const [usefulness, setUsefulness] = useState<Usefulness>(null);
  const [reportOpen, setReportOpen] = useState(startInReportMode);
  const [feedback, setFeedback] = useState("");
  const [band, setBand] = useState<ReviewBand>(() => suggestedBand(income));
  const [supportAmount, setSupportAmount] = useState(5);
  const [customSupport, setCustomSupport] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("");
  const [emailState, setEmailState] = useState<"idle" | "sending" | "sent">("idle");
  const [emailError, setEmailError] = useState("");
  const reportRef = useRef<HTMLElement>(null);
  const reviewRef = useRef<HTMLDivElement>(null);
  const chosenBand = reviewBands.find((item) => item.id === band)!;
  const finalSupport = useMemo(() => customSupport ? Number(customSupport) : supportAmount, [customSupport, supportAmount]);
  const strongest = headline(result.strong, "Your answers give us a useful starting point for the reporting work ahead.");
  const gaps = headline(result.attention.length ? result.attention : result.priorities, "No immediate weaker area was identified in this initial readiness check.");

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = JSON.parse(window.localStorage.getItem(storageKey) || "null") as { reportOpen?: boolean; usefulness?: Usefulness; choice?: Choice } | null;
        if (saved?.reportOpen) setReportOpen(true);
        if (saved?.usefulness) setUsefulness(saved.usefulness);
        if (saved?.choice) setChoice(saved.choice);
      } catch { /* A damaged local preference should not block the free report. */ }
    });
    void track(sessionId, "assessment_completed", {}, true);
    void track(sessionId, "result_preview_viewed", {}, true);
  }, [sessionId, storageKey]);

  useEffect(() => {
    try { window.localStorage.setItem(storageKey, JSON.stringify({ reportOpen, usefulness, choice })); } catch { /* The report remains available in the current tab. */ }
    if (reportOpen) {
      void track(sessionId, "report_opened", {}, true);
      window.setTimeout(() => reportRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }), 80);
    }
  }, [choice, reportOpen, sessionId, storageKey, usefulness]);

  function answerUsefulness(value: Exclude<Usefulness, null>) {
    setUsefulness(value);
    setError("");
    void track(sessionId, value === "very" ? "usefulness_very" : value === "somewhat" ? "usefulness_somewhat" : "usefulness_not_really", {}, true);
  }

  function openReport(nextChoice: Exclude<Choice, null>, eventType: "human_review_selected" | "support_5_selected" | "support_custom_selected" | "free_report_selected") {
    setChoice(nextChoice);
    setReportOpen(true);
    setError("");
    setIdempotencyKey("");
    void track(sessionId, eventType, nextChoice === "review" ? { paymentType: "human_review", band } : nextChoice === "support" ? { paymentType: "voluntary_support", band: "none" } : {}, true);
  }

  function showReview() {
    openReport("review", "human_review_selected");
    window.setTimeout(() => reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }

  function showSupport(custom = false) {
    if (!custom) { setSupportAmount(5); setCustomSupport(""); }
    openReport("support", custom ? "support_custom_selected" : "support_5_selected");
  }

  async function checkout(paymentType: "human_review" | "voluntary_support") {
    const amount = paymentType === "human_review" ? chosenBand.amount : finalSupport;
    if (!Number.isFinite(amount) || amount < 1 || amount > 1000) { setError("Choose an amount from £1 to £1,000."); return; }
    setBusy(true); setError("");
    const key = idempotencyKey || crypto.randomUUID();
    setIdempotencyKey(key);
    const startedEvent = paymentType === "human_review" ? "review_payment_started" : "contribution_started";
    await track(sessionId, startedEvent, { paymentType, band: paymentType === "human_review" ? band : "none", amountMinor: Math.round(amount * 100), currency: "GBP" });
    try {
      const response = await fetch("/api/sorp-payments/checkout", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ paymentType, band: paymentType === "human_review" ? band : null, amountMinor: Math.round(amount * 100), sessionId, organisation, idempotencyKey: key }),
      });
      const data = await response.json() as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || "Secure checkout could not be started.");
      window.location.assign(data.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Secure checkout could not be started. No payment was taken.");
      setBusy(false);
    }
  }

  async function sendReport(event: FormEvent) {
    event.preventDefault();
    setEmailError(""); setEmailState("sending");
    try {
      const response = await fetch("/api/readiness/report-email", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId, email, role, organisation, result }) });
      const data = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error || "We could not send your report just now.");
      setEmailState("sent");
      void track(sessionId, "email_report_requested", { role: role || "not_supplied" }, true);
    } catch (caught) {
      setEmailState("idle");
      setEmailError(caught instanceof Error ? caught.message : "We could not send your report just now.");
    }
  }

  const reviewPanel = <div ref={reviewRef} id="human-review" className="readiness-checkout-panel">
    <div><span>Human review · £{chosenBand.amount}</span><h4>SORP 2026 Impact Readiness Review</h4><p>We review your assessment and relevant reporting before the meeting, discuss the important gaps and judgement areas, and provide short written priorities afterwards.</p><ul><li>Assessment review</li><li>Latest Trustees’ Annual Report</li><li>Impact Report or Annual Review, if supplied</li><li>60-minute discussion</li><li>Strengths, gaps and judgement areas</li><li>Three priority actions</li><li>Short written summary</li></ul></div>
    <fieldset><legend>Charity size</legend>{reviewBands.map((item) => <label key={item.id} className={band === item.id ? "is-selected" : ""}><input type="radio" name="review-band" checked={band === item.id} onChange={() => { setBand(item.id); setIdempotencyKey(""); }} /><span><b>{item.label}</b><small>{item.income}</small></span><strong>£{item.amount}</strong></label>)}</fieldset>
    <p className="readiness-review-credit">If we subsequently work together on a My Social Impact project, we’ll credit the cost of your review against that work. There is no obligation to buy anything afterwards.</p>
    <button className="readiness-pay-button" type="button" disabled={busy} onClick={() => void checkout("human_review")}>{busy ? "OPENING SECURE CHECKOUT…" : `BOOK MY HUMAN REVIEW — £${chosenBand.amount}`} <span>→</span></button>
    <p className="readiness-payment-note">One-off payment through Stripe. Your email is collected securely in checkout. Cost genuinely a barrier? Email <a href="mailto:marcus@mysocialimpact.org">marcus@mysocialimpact.org</a>.</p>
  </div>;

  const supportPanel = <div className="readiness-checkout-panel is-support">
    <div><span>Voluntary contribution</span><h4>Support the free tool</h4><p>Help us keep improving this and building useful free tools for charities. Payment is entirely optional and your report is already open below.</p></div>
    <div className="readiness-support-amounts" aria-label="Choose a voluntary support amount">{[5,10,20].map((amount) => <button type="button" className={!customSupport && supportAmount === amount ? "is-selected" : ""} key={amount} onClick={() => { setSupportAmount(amount); setCustomSupport(""); setIdempotencyKey(""); }}>£{amount}</button>)}<label><span>Another amount £</span><input aria-label="Another support amount in pounds" type="number" min="1" max="1000" step="1" value={customSupport} onChange={(event) => { setCustomSupport(event.target.value); setIdempotencyKey(""); }} /></label></div>
    <button className="readiness-pay-button" type="button" disabled={busy || !Number.isFinite(finalSupport) || finalSupport < 1} onClick={() => void checkout("voluntary_support")}>{busy ? "OPENING SECURE CHECKOUT…" : `CONTRIBUTE £${Number.isFinite(finalSupport) ? finalSupport : 0} SECURELY`} <span>→</span></button>
    <p className="readiness-payment-note">This is optional support for the free tool. It is not a charitable donation and no Gift Aid or tax treatment is implied.</p>
  </div>;

  return <main className={`sorp-completion-flow${reportOpen ? " is-report-open" : ""}`}>
    {!reportOpen && <>
      <section className="sorp-completion-event" aria-labelledby="completion-title"><div className="sorp-completion-sweep" aria-hidden="true" /><button type="button" className="sorp-back-to-assessment" onClick={onBackToAssessment}>← Back to assessment</button><h1 id="completion-title">Your Full Readiness Review</h1><strong>Your developed SORP readiness assessment is ready.</strong></section>
      <section className="sorp-result-preview"><header><div><span>Your SORP readiness</span><h2>{result.band}</h2><p>{result.overview}</p><p className="sorp-result-confidence"><b>Confidence</b> {result.confidence}</p></div><div><strong>{result.score}</strong><span>/ 100</span></div></header><div className="sorp-result-preview-grid"><article><h3>What already looks strong</h3><ul>{strongest.map((item) => <li key={item}>{item}</li>)}</ul></article><article><h3>Important gaps</h3><ul>{gaps.map((item) => <li key={item}>{item}</li>)}</ul></article></div><p className="sorp-report-ready">This Full Review combines the public evidence with your answers and deeper SORP checks.</p></section>
      <section className="sorp-usefulness"><span>One quick question</span><h2>Has this been useful?</h2>
        {!usefulness && <div className="sorp-usefulness-actions"><button type="button" onClick={() => answerUsefulness("very")}>Yes — very useful <b>→</b></button><button type="button" onClick={() => answerUsefulness("somewhat")}>Yes — somewhat useful <b>→</b></button><button type="button" onClick={() => answerUsefulness("not_really")}>Not really <b>→</b></button></div>}
        {(usefulness === "very" || usefulness === "somewhat") && <div className="sorp-value-choice"><header><h3>Brilliant — that means it’s doing what we built it to do.</h3><p>If the free tool has told you everything you need, brilliant — that means it worked.</p><p>If you’d like to help us keep it free, £5 genuinely helps.</p></header><div className="sorp-value-choice-grid"><article><span>Optional human help</span><h3>Human review — £{chosenBand.amount}</h3><p>60-minute SORP 2026 Impact Readiness Review with My Social Impact.</p><button type="button" onClick={showReview}>Book my human review <b>→</b></button></article><article><span>Voluntary contribution</span><h3>Support the free tool — £5</h3><p>Help us keep improving this and building useful free tools for charities.</p><button type="button" onClick={() => showSupport(false)}>Chuck in £5 <b>→</b></button><button className="is-text" type="button" onClick={() => showSupport(true)}>Choose another amount</button></article></div><button className="sorp-free-report-choice" type="button" onClick={() => openReport("free", "free_report_selected")}>No thanks — show my free report <span>→</span></button></div>}
        {usefulness === "not_really" && <form className="sorp-missing-feedback" onSubmit={(event) => { event.preventDefault(); openReport("free", "free_report_selected"); }}><h3>Thanks — that’s useful to know.</h3><label htmlFor="sorp-missing-feedback">What was missing? <span>Optional</span></label><textarea id="sorp-missing-feedback" value={feedback} onChange={(event) => setFeedback(event.target.value)} maxLength={1000} rows={3} placeholder="A short note, if useful…" /><button type="submit">Show my free report <span>→</span></button></form>}
      </section>
    </>}
    {reportOpen && <section className="sorp-report-mode" ref={reportRef}><button type="button" className="sorp-back-to-assessment is-on-report" onClick={onBackToAssessment}>← Back to assessment</button><header className="sorp-report-mode-header"><div><span>Report mode · assessment complete</span><h1>Your personalised SORP readiness report</h1><p>{organisation || "Are You SORP Ready?"}</p></div><div><strong>{result.score}</strong><span>/ 100</span><button type="button" onClick={() => window.print()}>Print / save PDF</button></div></header>{choice === "review" && reviewPanel}{choice === "support" && supportPanel}<div className="sorp-full-report">{children}</div><section className="sorp-report-email"><div><span>Keep a copy</span><h2>Want a copy in your inbox?</h2><p>Your report is already available above. Email is optional.</p></div>{emailState === "sent" ? <p className="sorp-report-email-success" role="status">✓ Your report has been sent to {email}.</p> : <form onSubmit={sendReport}><label htmlFor="sorp-report-email">Email address<input id="sorp-report-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.org" /></label><label htmlFor="sorp-report-role">Your role — optional<select id="sorp-report-role" value={role} onChange={(event) => setRole(event.target.value as Role)}><option value="">Prefer not to say</option><option>Trustee</option><option>CEO</option><option>Employee</option><option>Adviser</option><option>Other</option></select></label><button type="submit" disabled={emailState === "sending"}>{emailState === "sending" ? "Sending…" : "Send my report"} <span>→</span></button>{emailError && <p role="alert">{emailError}</p>}</form>}</section>{choice !== "review" && <aside className="sorp-report-review-cta"><div><span>Optional human help</span><h2>Want to talk this through?</h2><p>We’ll review the evidence, judgement areas and three priority actions with you.</p></div><button type="button" onClick={showReview}>Book a human review — £{chosenBand.amount} <span>→</span></button></aside>}</section>}
    {error && <p className="readiness-payment-error" role="alert">{error}</p>}
  </main>;
}
