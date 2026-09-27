"use client";

import { useEffect, useRef, useState } from "react";
import "./sorp-review-booking.css";

const preparation = [
  "we review your completed SORP assessment before the meeting",
  "we read the comments and context you added",
  "we identify the most important readiness gaps",
  "we discuss what to prioritise before your next reporting period",
  "we look at where stronger evidence or measurement would help",
  "we help you move from year-end reporting towards managing impact more effectively throughout the year",
];

export const meetingOffers = [
  { id: "free", duration: 10, price: 0, title: "QUICK QUESTION / FIT CHECK", description: "Got a quick question, or not ready to pay for a review?", extra: "Book a short call to see whether My Social Impact can help.", cta: "BOOK A FREE 10-MINUTE CALL →", includes: [], fee: "No pre-review is included.", schedule: "AcZssZ1VWZK9YaNBoZq-q3_lBNF8NwU_d-n9hW2qcpJXT3TcP3cyKGStGhTSNjEQNcT2RCueZS78OTAG" },
  { id: "readiness", duration: 30, price: 50, title: "SORP READINESS REVIEW", description: "Talk through your SORP readiness, gaps and priorities with My Social Impact.", extra: "", cta: "BOOK MY £50 REVIEW →", includes: preparation, fee: "The £50 includes both our preparation beforehand and the 30-minute review session.", schedule: "AcZssZ0J1C6h2l6o3-xHvHjoUOOcsb0hOQFS26puUS4MXfhS8szsRTfgqUBIPSDakqOwFLeOFpSateq_" },
  { id: "wider", duration: 60, price: 100, title: "SORP + WIDER EVIDENCE REVIEW", description: "Go deeper into your SORP readiness and the wider impact evidence behind it.", extra: "", cta: "BOOK MY £100 REVIEW →", includes: ["everything included in the 30-minute SORP Readiness Review", "deeper pre-read of your completed assessment and comments", "light-touch review of ONE Impact Report or equivalent key wider-evidence source before the meeting", "strengths and gaps in that wider evidence", "how wider evidence can support future SORP reporting", "impact measurement and evidence", "how impact is defined, measured, learned from and reported throughout the year", "relevant opportunities across Purpose, Leadership, Data, Delivery and Communication", "practical priorities for moving towards Social Impact Excellence"], fee: "The £100 includes our preparation, a light-touch wider-evidence review and the 60-minute working session.", schedule: "AcZssZ0_mHEZE4RWJfTJ7rxo5XtANk-HJfE4EXgDNJ13mGuPB-5M02Q4ThVD36YNv_pZAknrk3_Qz8X6" },
] as const;

type OfferId = typeof meetingOffers[number]["id"];

export function SorpReviewBooking({ shared = false, onSelect }: { shared?: boolean; onSelect?: () => void }) {
  const [selected, setSelected] = useState<OfferId | null>(null);
  const [sharedOffer, setSharedOffer] = useState<OfferId | null>(null);
  const [calendarLoaded, setCalendarLoaded] = useState(false);
  const [calendarSlow, setCalendarSlow] = useState(false);
  const [reload, setReload] = useState(0);
  const [copied, setCopied] = useState("");
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!shared) return;
    const id = new URLSearchParams(window.location.search).get("session");
    if (meetingOffers.some(offer => offer.id === id)) setSharedOffer(id as OfferId);
  }, [shared]);
  useEffect(() => {
    if (!selected) return;
    setCalendarLoaded(false);
    setCalendarSlow(false);
    const timer = window.setTimeout(() => setCalendarSlow(true), 12000);
    panel.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    return () => window.clearTimeout(timer);
  }, [selected, reload]);

  const offer = meetingOffers.find(item => item.id === selected);
  const sharePath = (id: OfferId) => `/are-you-sorp-ready/review/booking?session=${id}`;
  async function share(id: OfferId) {
    const url = `${window.location.origin}${sharePath(id)}`;
    try { await navigator.clipboard.writeText(url); setCopied(id); }
    catch { setCopied(`manual-${id}`); }
  }

  return <div className="sorp-meetings">
    <h1>WANT TO TALK THROUGH YOUR RESULTS?</h1>
    <p>SORP readiness is a useful starting point.</p>
    <p>The bigger opportunity is to make impact something your organisation defines, measures, learns from and improves throughout the year.</p>
    <p>My Social Impact can review your results with you and help you decide what matters next.</p>
    <p className="sorp-meetings-limited">LIMITED REVIEW SLOTS AVAILABLE EACH WEEK.</p>
    <div className="sorp-meetings-options">{meetingOffers.filter(item => !sharedOffer || item.id === sharedOffer).map(item => <article key={item.id} className={`sorp-meeting-option${item.id === "readiness" ? " is-preferred" : ""}`}>
      <div className="sorp-meeting-badge">{item.id === "readiness" ? "BEST STARTING POINT" : "\u00a0"}</div>
      <p className="sorp-meeting-price">{item.duration} MINUTES — {item.price ? `£${item.price}` : "FREE"}</p>
      <h2>{item.title}</h2><p>{item.description}</p>{item.extra && <p>{item.extra}</p>}
      {item.includes.length > 0 && <details><summary>WHAT’S INCLUDED <span aria-hidden="true">+</span></summary><ul>{item.includes.map(line => <li key={line}>{line}</li>)}</ul></details>}
      <p className="sorp-meeting-fee">{item.fee}</p>
      <button type="button" className="sorp-meeting-book" aria-pressed={selected === item.id} onClick={() => { setSelected(item.id); onSelect?.(); }}>{selected === item.id ? "AVAILABILITY OPEN BELOW ↓" : item.cta}</button>
    </article>)}</div>
    <p className="sorp-meeting-credit">For paid sessions: if the session leads directly to a larger My Social Impact engagement, we can credit the session fee against that work.</p>

    {offer && <section className="sorp-meeting-calendar" ref={panel} aria-label="Book your selected session">
      <div className="sorp-meeting-calendar-heading"><div><p className="scr-kicker">SELECT YOUR DATE AND TIME</p><h2>{offer.title}</h2><p>{offer.duration} minutes · {offer.price ? `£${offer.price} — payment required to complete your booking` : "Free"}</p></div><button type="button" className="sorp-meeting-close" onClick={() => setSelected(null)}>CLOSE CALENDAR ×</button></div>
      <p>Book with the email you used for your SORP review so we can match your results and comments to your session.</p>
      <p className="sorp-meeting-handoff">Availability opens below. Google may open its secure booking and payment form in a new tab; your MSI review stays here.</p>
      {offer.id === "wider" && <div className="sorp-meeting-evidence"><h3>PASTE A LINK</h3><p>Add one Impact Report / key document link in the booking form after choosing your time.</p><p>If you send this before the meeting, we’ll review it in advance and bring the key strengths and gaps into the session.</p><small>No separate full written Impact Report audit is included. If you don’t have a link, reply to your booking confirmation with the document before the meeting.</small></div>}
      {!calendarLoaded && <p role="status" className="sorp-meeting-loading">{calendarSlow ? "Google availability is taking longer to open. You can retry below; your review is safe." : "Opening Google availability…"}</p>}
      <iframe key={`${offer.id}-${reload}`} title={`Google booking — ${offer.title}`} src={`https://calendar.google.com/calendar/appointments/schedules/${offer.schedule}?gv=true`} width="100%" height="720" onLoad={() => setCalendarLoaded(true)} />
      <div className="sorp-meeting-calendar-note"><p>Google confirms your session, date and time after booking and sends your invitation by email. {offer.price > 0 && "Google handles the required payment through Stripe."}</p>{calendarSlow && <button type="button" className="sorp-meeting-close" onClick={() => setReload(value => value + 1)}>CALENDAR NOT SHOWING? TRY AGAIN →</button>}</div>
    </section>}

    <section className="sorp-meeting-share"><h2>NEED SOMEONE ELSE TO APPROVE THIS?</h2><p>If someone else at your organisation handles payments, send them this booking option.</p>{meetingOffers.filter(item => item.price > 0 && (!sharedOffer || item.id === sharedOffer)).map(item => <div key={item.id}><strong>{item.title} · £{item.price}</strong><button type="button" onClick={() => void share(item.id)}>{copied === item.id ? "LINK COPIED ✓" : "SHARE THIS BOOKING OPTION →"}</button>{copied === `manual-${item.id}` && <p role="status">Copy this link: <a href={sharePath(item.id)}>{`${typeof window === "undefined" ? "https://mysocialimpact.org" : window.location.origin}${sharePath(item.id)}`}</a></p>}</div>)}<small>The shared page contains only the session details—not your assessment or personal information.</small></section>
    <section className="sorp-meeting-advisers"><h2>ACCOUNTANT OR ADVISER?</h2><p>Supporting charity clients with SORP 2026?</p><p>My Social Impact specialises in impact strategy, evidence and reporting, and we work alongside accountants and advisers helping charities respond to the new impact-reporting requirements.</p><a href="mailto:marcus@mysocialimpact.org?subject=Adviser%20%2F%20multi-charity%20SORP%20support">TALK TO US ABOUT ADVISER / MULTI-CHARITY SUPPORT →</a></section>
    <div className="sorp-meeting-positioning"><h2>SORP IS THE REQUIREMENT.<br/><em>BETTER IMPACT IS THE OPPORTUNITY.</em></h2><p>Social Impact Excellence looks beyond compliance across:</p><p>Purpose · Leadership · Data · Delivery · Communication.</p></div>
  </div>;
}
