"use client";

import { useEffect, useMemo, useState } from "react";

type ReviewBand = "small" | "medium" | "large";
type Choice = "review" | "support" | null;

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

export function SorpResultActions({ sessionId, organisation, income }: { sessionId: string; organisation: string; income: string }) {
  const [choice, setChoice] = useState<Choice>(null);
  const [band, setBand] = useState<ReviewBand>(() => suggestedBand(income));
  const [supportAmount, setSupportAmount] = useState(5);
  const [customSupport, setCustomSupport] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const chosenBand = reviewBands.find((item) => item.id === band)!;
  const finalSupport = useMemo(() => customSupport ? Number(customSupport) : supportAmount, [customSupport, supportAmount]);

  useEffect(() => {
    void track(sessionId, "free_assessment_completed", {}, true);
    void track(sessionId, "result_viewed", {}, true);
  }, [sessionId]);

  function selectReview() {
    setChoice("review"); setError(""); setIdempotencyKey("");
    void track(sessionId, "review_cta_clicked", { paymentType: "human_review", band });
  }

  function selectSupport() {
    setChoice("support"); setError(""); setIdempotencyKey("");
    void track(sessionId, "voluntary_support_shown", { paymentType: "voluntary_support", band: "none" }, true);
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
        method: "POST",
        headers: { "content-type": "application/json" },
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

  return <section className="readiness-paid-next" aria-label="Optional next steps">
    <header><span>Your free report is complete</span><h3>What would you like to do next?</h3><p>Nothing here changes or unlocks your free result.</p></header>
    <div className="readiness-next-choices">
      <button type="button" className={choice === "review" ? "is-active" : ""} onClick={selectReview}><strong>I’d like a human review</strong><span>60 minutes with My Social Impact →</span></button>
      <button type="button" className={choice === "support" ? "is-active" : ""} onClick={selectSupport}><strong>I don’t need further help</strong><span>Finish here, with optional support →</span></button>
    </div>
    {choice === "review" && <div className="readiness-checkout-panel">
      <div><span>Optional human review</span><h4>SORP 2026 Impact Readiness Review</h4><p>Marcus and the MSI team will review your result, discuss strengths, weaker areas and genuine judgement calls, identify practical next steps and explore where going beyond minimum compliance could help. You can optionally share your latest Trustees’ Annual Report or Impact Report.</p><p><strong>Afterwards:</strong> a short written summary of what looks strong, what needs attention and your three priorities.</p></div>
      <fieldset><legend>Choose the charity size</legend>{reviewBands.map((item) => <label key={item.id} className={band === item.id ? "is-selected" : ""}><input type="radio" name="review-band" checked={band === item.id} onChange={() => { setBand(item.id); setIdempotencyKey(""); }} /><span><b>{item.label}</b><small>{item.income}</small></span><strong>£{item.amount}</strong></label>)}</fieldset>
      <p className="readiness-review-credit">If we subsequently work together on a My Social Impact project, we’ll credit the cost of your review against that work. There is no obligation to buy anything afterwards.</p>
      <button className="readiness-pay-button" type="button" disabled={busy} onClick={() => void checkout("human_review")}>{busy ? "OPENING SECURE CHECKOUT…" : `PAY £${chosenBand.amount} SECURELY`} <span>→</span></button>
      <p className="readiness-payment-note">One-off payment through Stripe. Your email is collected securely in checkout. Cost genuinely a barrier? Email <a href="mailto:marcus@mysocialimpact.org">marcus@mysocialimpact.org</a>.</p>
    </div>}
    {choice === "support" && <div className="readiness-checkout-panel is-support">
      <div><span>Entirely optional</span><h4>Help us keep this free</h4><p>Your assessment and report are already complete. If this was useful and you would like to help us keep it free for smaller charities, you can make a one-off voluntary contribution.</p></div>
      <div className="readiness-support-amounts" aria-label="Choose a voluntary support amount">{[3,5,10,20].map((amount) => <button type="button" className={!customSupport && supportAmount === amount ? "is-selected" : ""} key={amount} onClick={() => { setSupportAmount(amount); setCustomSupport(""); setIdempotencyKey(""); }}>£{amount}</button>)}<label><span>Other £</span><input type="number" min="1" max="1000" step="1" value={customSupport} onChange={(event) => { setCustomSupport(event.target.value); setIdempotencyKey(""); }} /></label></div>
      <button className="readiness-pay-button" type="button" disabled={busy || !Number.isFinite(finalSupport) || finalSupport < 1} onClick={() => void checkout("voluntary_support")}>{busy ? "OPENING SECURE CHECKOUT…" : `CONTRIBUTE £${Number.isFinite(finalSupport) ? finalSupport : 0} SECURELY`} <span>→</span></button>
      <button className="readiness-no-thanks" type="button" onClick={() => { setChoice(null); void track(sessionId, "voluntary_support_no_thanks", { paymentType: "voluntary_support", band: "none" }); }}>No thanks — finish here</button>
      <p className="readiness-payment-note">This is optional support for the free tool. It is not presented as a charitable donation and no Gift Aid or tax treatment is implied.</p>
    </div>}
    {error && <p className="readiness-payment-error" role="alert">{error}</p>}
  </section>;
}
