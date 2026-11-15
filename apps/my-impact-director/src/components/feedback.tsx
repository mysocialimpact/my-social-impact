"use client";
import { Arrow } from "./icons";
import { useState } from "react";
import Link from "next/link";
import { api } from "./session";
export function Feedback({ from }: { from: string }) {
  const [rating, setRating] = useState<number | null>(null),
    [comment, setComment] = useState(""),
    [busy, setBusy] = useState(false),
    [sent, setSent] = useState(false),
    [error, setError] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!rating || busy) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/visitor", { method: "POST" });
      await api("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rating, comment, page: from }),
      });
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="feedback-layout">
      <div>
        <h1>
          Help us make
          <br />
          <em>this better.</em>
        </h1>
        <p>What works? What doesn’t? What have we missed?</p>
        <p>
          Your feedback goes directly to the My Social Impact founder inbox. No
          name or email needed.
        </p>
        <p>
          Thanks for helping the next organisation.
          <br />
          <strong>Marcus Warry</strong>
          <br />
          Co-founder, My Social Impact
        </p>
      </div>
      {sent ? (
        <div className="feedback-thanks" role="status">
          <h2>
            Heard.
            <br />
            Thank you.
          </h2>
          <p>Your feedback is saved for the team.</p>
          <Link href={from}>
            Back to where you were <Arrow diagonal />
          </Link>
        </div>
      ) : (
        <form onSubmit={submit}>
          <fieldset>
            <legend>How useful is My Impact Director?</legend>
            <div className="feedback-ratings">
              {[1, 2, 3, 4, 5].map((value) => (
                <label
                  key={value}
                  className={rating === value ? "selected" : ""}
                >
                  <input
                    type="radio"
                    name="rating"
                    value={value}
                    checked={rating === value}
                    onChange={() => setRating(value)}
                    required
                  />
                  <span>{value}</span>
                </label>
              ))}
            </div>
            <div className="rating-scale">
              <span>Not useful yet</span>
              <span>Extremely useful</span>
            </div>
          </fieldset>
          <label>
            What would make it better?{" "}
            <span className="optional-label">Optional</span>
            <textarea
              rows={5}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={3000}
            />
          </label>
          <p className="fine-print">
            Please leave out personal or confidential information. To request a
            response,{" "}
            <Link href="/services/expert-review#enquire">talk to us</Link>.
          </p>
          {error && (
            <p className="alert error" role="alert">
              {error}
            </p>
          )}
          <button className="button primary" disabled={!rating || busy}>
            {busy ? "Saving…" : "Send feedback"}
          </button>
        </form>
      )}
    </div>
  );
}
