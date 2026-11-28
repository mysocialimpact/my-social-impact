"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { api } from "./session";

export function PublicFeedback() {
  const path = usePathname();
  if (
    !path ||
    /^\/(admin|founder|feedback|access|open)(\/|$)/.test(path) ||
    path.endsWith("/source")
  )
    return null;
  const reviewId = /^\/reviews\/([a-f\d-]{36})$/i.exec(path)?.[1];
  return <Feedback key={path} from={path} reviewId={reviewId} />;
}
export function disputeFinding(section: string) {
  window.dispatchEvent(
    new CustomEvent("mid-feedback-dispute", { detail: section }),
  );
}
export function Feedback({
  from,
  uploadIssue = false,
  reviewId,
  dedicated = false,
}: {
  from: string;
  uploadIssue?: boolean;
  reviewId?: string;
  dedicated?: boolean;
}) {
  const [rating, setRating] = useState<number | null>(null),
    [hover, setHover] = useState(0),
    [comment, setComment] = useState(
      uploadIssue ? "I couldn’t upload my impact report. " : "",
    ),
    [email, setEmail] = useState(""),
    [consent, setConsent] = useState(false),
    [section, setSection] = useState(""),
    [sent, setSent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const memo = useRef({ body: "", id: "" }),
    locked = useRef(false),
    note = useRef<HTMLTextAreaElement>(null),
    thanks = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function dispute(e: Event) {
      setSection((e as CustomEvent<string>).detail);
      setSent(false);
      requestAnimationFrame(() => note.current?.focus());
    }
    window.addEventListener("mid-feedback-dispute", dispute);
    return () => window.removeEventListener("mid-feedback-dispute", dispute);
  }, []);
  useEffect(() => {
    if (sent) thanks.current?.focus({ preventScroll: true });
  }, [sent]);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (locked.current || (!rating && !comment.trim())) return;
    locked.current = true;
    setBusy(true);
    setError("");
    const sharedToken =
      from === "/shared" &&
      /^[\w-]{36}\.[\w-]{43}$/.test(window.location.hash.slice(1))
        ? window.location.hash.slice(1)
        : undefined;
    const body = {
      sharedToken,
      rating,
      comment,
      email: email.trim(),
      consent: !!email.trim() && consent,
      page: from,
      reviewId,
      section,
      website: new FormData(e.currentTarget).get("website"),
    };
    if (memo.current.body !== JSON.stringify(body))
      memo.current = { body: JSON.stringify(body), id: crypto.randomUUID() };
    try {
      await api("/api/visitor", { method: "POST" });
      const result = await api("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...body, requestId: memo.current.id }),
      });
      if (!result.saved || result.id !== memo.current.id)
        throw Error("We couldn’t confirm receipt. Please try again.");
      setSent(true);
      setEmail("");
      setConsent(false);
      setRating(null);
      setComment("");
      setSection("");
      memo.current = { body: "", id: "" };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please try again.");
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  const Heading = dedicated ? "h1" : "h2";
  return (
    <section
      className="listening"
      aria-labelledby="feedback-title"
      id="public-feedback"
    >
      <div className="listening-inner">
        <div className="listening-intro">
          <Heading id="feedback-title">
            What do
            <br />
            <em>you think?</em>
          </Heading>
          <p>
            We’re building My Impact Director to make useful intelligence
            available to everyone.
          </p>
          <p>Your feedback genuinely helps us improve it.</p>
          <p>
            We love hearing what works. And we especially value hearing what
            doesn’t.
          </p>
        </div>
        <div>
          {sent ? (
            <div
              className="listening-thanks"
              tabIndex={-1}
              ref={thanks}
              role="status"
            >
              <h3>
                Thank you for
                <br />
                <em>telling us.</em>
              </h3>
              <p>
                Your feedback is saved. We appreciate you taking the time to
                help shape My Impact Director.
              </p>
            </div>
          ) : (
            <form className="listening-form" onSubmit={submit}>
              <fieldset disabled={busy}>
                <legend>How was your experience?</legend>
                <div
                  className="listening-stars"
                  onMouseLeave={() => setHover(0)}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <label
                      key={n}
                      onMouseEnter={() => setHover(n)}
                      data-filled={(hover || rating || 0) >= n}
                    >
                      <input
                        type="radio"
                        name="rating"
                        aria-label={n + " " + (n === 1 ? "star" : "stars")}
                        checked={rating === n}
                        onChange={() => setRating(n)}
                      />
                      <span aria-hidden="true">★</span>
                    </label>
                  ))}
                  {rating && (
                    <button
                      type="button"
                      className="clear-rating"
                      onClick={() => setRating(null)}
                    >
                      Clear
                    </button>
                  )}
                </div>
                <p className="star-prompt" aria-live="polite">
                  {!rating
                    ? "Leave a rating, a comment, or both."
                    : rating <= 2
                      ? "If you’d like to share what went wrong, we’re listening."
                      : rating === 3
                        ? "What worked, and what could feel better?"
                        : "Thank you. What could we improve next?"}
                </p>
              </fieldset>
              {reviewId || from === "/shared" ? (
                <label>
                  What is this about?
                  <select
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                  >
                    <option value="">The overall experience</option>
                    <option value="score">A score I disagree with</option>
                    <option value="finding">An unsupported finding</option>
                    <option value="clarity">An unclear explanation</option>
                    <option value="usability">Using the report</option>
                    {section.startsWith("criterion-") && (
                      <option value={section}>
                        Finding {section.slice(10)}
                      </option>
                    )}
                  </select>
                </label>
              ) : null}
              <label>
                Your thoughts <small>Optional</small>
                <textarea
                  ref={note}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={3000}
                  rows={3}
                  placeholder="What’s on your mind?"
                />
              </label>
              <label>
                Email for a reply <small>Optional</small>
                <input
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setConsent(false);
                  }}
                  placeholder="you@example.org"
                />
              </label>
              {email.trim() && (
                <label className="reply-choice">
                  <input
                    type="checkbox"
                    checked={consent}
                    required
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  Yes, the team may email me about this feedback.
                </label>
              )}
              <label className="feedback-trap" aria-hidden="true">
                Website
                <input tabIndex={-1} name="website" autoComplete="off" />
              </label>
              {error && (
                <p role="alert" className="alert error">
                  {error}
                </p>
              )}
              <button
                disabled={busy || (!rating && !comment.trim())}
                className="feedback-send"
              >
                {busy ? "Sending…" : "Send feedback"}
              </button>
            </form>
          )}
          <div className="listening-note">
            <strong>Your feedback is read, considered and acted on.</strong>
            <p>
              AI helps us spot patterns. When something needs judgement, a
              conversation or a decision, a person takes it from there. If you’d
              like a reply, leave your email.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
