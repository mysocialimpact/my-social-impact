"use client";

import { useEffect, useRef, useState } from "react";
import { bookingServices, BOOKING_TIME_ZONE, type BookingServiceId } from "./booking-config";
import { InlineStripeCheckout } from "./inline-stripe-checkout";
import "./sorp-review-booking.css";

export const meetingOffers = bookingServices;
type Slot = { start: string; end: string };
type Details = { name: string; email: string; organisation: string };
type Checkout = { clientSecret: string; sessionId: string };
type Confirmation = { session: string; start: string; priceMinor: number; paid?: boolean; invitationSent: boolean };
const REVIEW_KEY = "msi-sorp-final-candidate-v1";
const formatDate = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: BOOKING_TIME_ZONE, weekday: "long", day: "numeric", month: "long" }).format(new Date(iso)).toUpperCase();
const formatTime = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: BOOKING_TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));

async function jsonRequest(url: string, body?: unknown) {
  const response = await fetch(url, body === undefined ? { cache: "no-store" } : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok || result.error) throw new Error(result.error || "That booking step could not be completed.");
  return result;
}

export function SorpReviewBooking({ shared = false, onSelect }: { shared?: boolean; onSelect?: () => void }) {
  const [selected, setSelected] = useState<BookingServiceId | null>(null);
  const [sharedOffer, setSharedOffer] = useState<BookingServiceId | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [details, setDetails] = useState<Details>({ name: "", email: "", organisation: "" });
  const [reviewSessionId, setReviewSessionId] = useState("");
  const [evidence, setEvidence] = useState("");
  const [evidenceBusy, setEvidenceBusy] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [copied, setCopied] = useState("");
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const stored = JSON.parse(localStorage.getItem(REVIEW_KEY) || "null");
        if (stored) {
          setDetails({ name: stored.name || "", email: stored.email || "", organisation: stored.candidate?.name || "" });
          setReviewSessionId(stored.sessionId || "");
        }
      } catch { /* Shared booking remains usable without saved review details. */ }
      if (shared) {
        const id = new URLSearchParams(window.location.search).get("session");
        if (bookingServices.some((offer) => offer.id === id)) setSharedOffer(id as BookingServiceId);
      }
    });
  }, [shared]);

  useEffect(() => {
    if (!selected) return;
    queueMicrotask(() => {
      setBusy("availability"); setError(""); setSlots([]); setSlot(null); setCheckout(null); setConfirmation(null);
      panel.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      void jsonRequest(`/api/booking/availability?service=${selected}`).then((result) => setSlots(result.slots || [])).catch((cause) => setError(cause instanceof Error ? cause.message : "Availability could not be checked.")).finally(() => setBusy(""));
    });
  }, [selected]);

  const offer = bookingServices.find((item) => item.id === selected) || null;
  const sharePath = (id: BookingServiceId) => `/are-you-sorp-ready/review/booking?session=${id}`;
  const grouped = Object.entries(slots.reduce<Record<string, Slot[]>>((dates, item) => { (dates[formatDate(item.start)] ||= []).push(item); return dates; }, {}));

  async function share(id: BookingServiceId) {
    const url = `${window.location.origin}${sharePath(id)}`;
    try { await navigator.clipboard.writeText(url); setCopied(id); }
    catch { setCopied(`manual-${id}`); }
  }

  async function uploadEvidence(file?: File) {
    if (!file) return;
    if (file.size > 4_000_000 || !(/\.(pdf|doc|docx)$/i.test(file.name))) { setError("Choose one PDF or Word document up to 4 MB."); return; }
    setEvidenceBusy(true); setError("");
    try {
      const stored = JSON.parse(localStorage.getItem(REVIEW_KEY) || "null");
      const form = new FormData();
      form.set("file", file, file.name); form.set("state", JSON.stringify(stored?.state || {})); form.set("sessionId", reviewSessionId || crypto.randomUUID());
      if (stored?.intelligence?.effectiveVersion) form.set("intelligenceVersion", stored.intelligence.effectiveVersion);
      const response = await fetch("/api/readiness/report", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "That document could not be read.");
      const summary = result.state?.organisationResearch?.selected?.publicReadiness?.widerEvidenceReason || result.assistant?.message || "Ready for MSI review.";
      setEvidence(`${file.name} — reviewed through the existing MSI evidence service. ${summary}`.slice(0, 800));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "That document could not be read."); }
    finally { setEvidenceBusy(false); }
  }

  function validDetails() { return details.name.trim() && details.organisation.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email.trim()); }
  async function beginBooking() {
    if (!offer || !slot || !validDetails() || busy) { setError("Choose a time and complete your name, email and organisation."); return; }
    const attemptId = `${reviewSessionId || "shared"}:${offer.id}:${slot.start}:${crypto.randomUUID()}`.slice(0, 120);
    setBusy("booking"); setError("");
    try {
      const payload = { serviceId: offer.id, start: slot.start, ...details, evidence, reviewSessionId, idempotencyKey: attemptId };
      if (!offer.priceMinor) setConfirmation(await jsonRequest("/api/booking/free", payload));
      else {
        const result = await jsonRequest("/api/booking/payment/create", payload);
        if (result.presentation !== "embedded" || !result.clientSecret || !result.id) throw new Error("Inline payment could not be opened. No payment was taken.");
        setCheckout({ clientSecret: result.clientSecret, sessionId: result.id });
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The booking could not be started."); }
    finally { setBusy(""); }
  }

  async function finalisePaid() {
    if (!checkout) return;
    setBusy("finalising"); setError("");
    try { setConfirmation(await jsonRequest("/api/booking/payment/finalise", { sessionId: checkout.sessionId, ...details, evidence })); setCheckout(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Payment completed but the booking could not yet be confirmed. Please retry confirmation."); }
    finally { setBusy(""); }
  }

  return <div className="sorp-meetings">
    <h1>WANT TO TALK THROUGH YOUR RESULTS?</h1><p>SORP readiness is a useful starting point.</p><p>The bigger opportunity is to make impact something your organisation defines, measures, learns from and improves throughout the year.</p><p>My Social Impact can review your results with you and help you decide what matters next.</p><p className="sorp-meetings-limited">LIMITED REVIEW SLOTS AVAILABLE EACH WEEK.</p>
    <div className="sorp-meetings-options">{bookingServices.filter((item) => !sharedOffer || item.id === sharedOffer).map((item) => <article key={item.id} className={`sorp-meeting-option${item.id === "readiness" ? " is-preferred" : ""}`}>
      <div className="sorp-meeting-badge">{item.label || "\u00a0"}</div><p className="sorp-meeting-price">{item.duration} MINUTES — {item.priceMinor ? `£${item.priceMinor / 100}` : "FREE"}</p><h2>{item.name}</h2><p>{item.description}</p>{item.includes.length > 0 && <details><summary>WHAT’S INCLUDED <span aria-hidden="true">+</span></summary><ul>{item.includes.map((line) => <li key={line}>{line}</li>)}</ul></details>}<p className="sorp-meeting-fee">{item.fee}</p><button type="button" className="sorp-meeting-book" aria-pressed={selected === item.id} onClick={() => { setSelected(item.id); onSelect?.(); }}>{selected === item.id ? "SELECT A TIME BELOW ↓" : item.cta}</button>
    </article>)}</div><p className="sorp-meeting-credit">For paid sessions: if the session leads directly to a larger My Social Impact engagement, we can credit the session fee against that work.</p>

    {offer && <section className="sorp-meeting-calendar" ref={panel} aria-label="Book your selected session"><div className="sorp-meeting-calendar-heading"><div><p className="scr-kicker">SELECT A DATE</p><h2>{offer.name}</h2><p>{offer.duration} minutes · {offer.priceMinor ? `£${offer.priceMinor / 100} — payment required` : "Free"} · Europe/London time</p></div><button type="button" className="sorp-meeting-close" onClick={() => setSelected(null)}>CLOSE ×</button></div>
      {busy === "availability" && <p role="status" className="sorp-meeting-loading">Checking Marcus’s live Calendar…</p>}{!busy && !slots.length && !error && <p>No selected appointment times are currently free. Please check again later.</p>}
      {!!grouped.length && <div className="sorp-slot-days">{grouped.map(([date, dateSlots]) => <div className="sorp-slot-day" key={date}><h3>{date}</h3><div>{dateSlots.map((item) => <button type="button" key={item.start} aria-pressed={slot?.start === item.start} onClick={() => { setSlot(item); setCheckout(null); setConfirmation(null); }}>{formatTime(item.start)}</button>)}</div></div>)}</div>}
      {slot && !confirmation && <div className="sorp-booking-details"><p className="scr-kicker">YOUR BOOKING DETAILS</p><p>{formatDate(slot.start)} · {formatTime(slot.start)} · Europe/London</p><div className="sorp-booking-fields"><label>NAME<input autoComplete="name" value={details.name} onChange={(event) => setDetails((value) => ({ ...value, name: event.target.value }))}/></label><label>EMAIL<input type="email" autoComplete="email" value={details.email} onChange={(event) => setDetails((value) => ({ ...value, email: event.target.value }))}/></label><label>CHARITY / ORGANISATION<input autoComplete="organization" value={details.organisation} onChange={(event) => setDetails((value) => ({ ...value, organisation: event.target.value }))}/></label></div>
        {offer.supportingEvidence && <div className="sorp-meeting-evidence"><h3>IMPACT REPORT / KEY WIDER-EVIDENCE SOURCE</h3><p>If you send this before the meeting, we’ll review it in advance and bring the key strengths and gaps into the session.</p><label className="sorp-evidence-upload">UPLOAD ONE DOCUMENT<input type="file" accept=".pdf,.doc,.docx" disabled={evidenceBusy} onChange={(event) => void uploadEvidence(event.target.files?.[0])}/></label><span>OR</span><label>PASTE ONE LINK<input type="url" placeholder="https://…" value={evidence.startsWith("http") ? evidence : ""} onChange={(event) => setEvidence(event.target.value)}/></label>{evidenceBusy && <p role="status">Reading the document securely…</p>}{evidence && !evidence.startsWith("http") && <p role="status">✓ {evidence.split(" — ")[0]} is ready for preparation.</p>}<small>No separate full written Impact Report audit is included. You can book without supplying this now.</small></div>}
        {!checkout && <button className="sorp-meeting-confirm" type="button" disabled={!!busy || !validDetails()} onClick={() => void beginBooking()}>{busy === "booking" ? "CHECKING YOUR TIME…" : offer.priceMinor ? `CONTINUE TO SECURE £${offer.priceMinor / 100} PAYMENT →` : "CONFIRM MY FREE CALL →"}</button>}
        {checkout && <div className="sorp-booking-payment"><h3>SECURE INLINE PAYMENT</h3><p>Your selected time is re-checked before any authorised payment is captured.</p><InlineStripeCheckout clientSecret={checkout.clientSecret} onComplete={finalisePaid}/>{busy === "finalising" && <p role="status">Confirming payment and creating your Calendar invitation…</p>}<button type="button" className="sorp-meeting-close" onClick={() => setCheckout(null)}>CLOSE PAYMENT</button></div>}
      </div>}
      {confirmation && <div className="sorp-booking-confirmed" role="status"><p className="scr-kicker">YOU’RE BOOKED ✓</p><h2>{confirmation.session}</h2><dl><div><dt>DATE</dt><dd>{formatDate(confirmation.start)}</dd></div><div><dt>TIME</dt><dd>{formatTime(confirmation.start)} · Europe/London</dd></div><div><dt>PRICE</dt><dd>{confirmation.priceMinor ? `£${confirmation.priceMinor / 100} · PAID` : "FREE"}</dd></div></dl><p>We already have your SORP review and the comments you added, so you won’t need to start from scratch.</p>{offer.supportingEvidence && !evidence && <p>Remember to send your Impact Report / wider evidence before the session.</p>}<p>✓ A Google Calendar invitation has been sent.</p></div>}{error && <p className="sp-error" role="alert">{error}</p>}
    </section>}

    <section className="sorp-meeting-share"><h2>NEED SOMEONE ELSE TO APPROVE THIS?</h2><p>If someone else at your organisation handles payments, send them this booking option.</p>{bookingServices.filter((item) => item.priceMinor > 0 && (!sharedOffer || item.id === sharedOffer)).map((item) => <div key={item.id}><strong>{item.name} · £{item.priceMinor / 100}</strong><button type="button" onClick={() => void share(item.id)}>{copied === item.id ? "LINK COPIED ✓" : "SHARE THIS BOOKING OPTION →"}</button>{copied === `manual-${item.id}` && <p role="status">Copy this link: <a href={sharePath(item.id)}>{`${typeof window === "undefined" ? "https://mysocialimpact.org" : window.location.origin}${sharePath(item.id)}`}</a></p>}</div>)}<small>The shared page contains only the service, duration, price and what’s included—not your assessment or personal information.</small></section>
    <section className="sorp-meeting-advisers"><h2>ACCOUNTANT OR ADVISER?</h2><p>Supporting charity clients with SORP 2026?</p><p>My Social Impact specialises in impact strategy, evidence and reporting, and works alongside accountants and advisers helping charities respond to the new impact-reporting requirements.</p><a href="mailto:marcus@mysocialimpact.org?subject=Adviser%20%2F%20multi-charity%20SORP%20support">TALK TO US ABOUT ADVISER / MULTI-CHARITY SUPPORT →</a></section><div className="sorp-meeting-positioning"><h2>SORP IS THE REQUIREMENT.<br/><em>BETTER IMPACT IS THE OPPORTUNITY.</em></h2><p>Social Impact Excellence looks beyond compliance across:</p><p>Purpose · Leadership · Data · Delivery · Communication.</p></div>
  </div>;
}
