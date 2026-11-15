"use client";
import { useEffect, useState } from "react";
import { api } from "./session";
import { Arrow } from "./icons";
export function SaveReview({
  id,
  returning = false,
}: {
  id?: string;
  returning?: boolean;
}) {
  const [enabled, setEnabled] = useState<boolean | null>(null),
    [sent, setSent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api("/api/save")
      .then((d) => {
        if (active) setEnabled(d.emailEnabled);
      })
      .catch(() => {
        if (active) setEnabled(false);
      });
    return () => {
      active = false;
    };
  }, []);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = new FormData(e.currentTarget).get("email");
    setBusy(true);
    setError("");
    try {
      await api("/api/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, ...(id ? { reviewId: id } : {}) }),
      });
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className={"keep-review " + (returning ? "return-review" : "")}
      id={id ? "keep-review" : undefined}
    >
      <div>
        <p className="eyebrow">
          {returning
            ? "PICK UP WHERE YOU LEFT OFF"
            : "YOURS TO KEEP. ENTIRELY OPTIONAL."}
        </p>
        <h2>
          {returning
            ? "Return to your saved reviews."
            : "Keep your full report."}
        </h2>
        <p>
          {returning
            ? "Enter the email you used to save a review. We’ll send a private sign-in link. No password to remember."
            : "Your results are already yours to explore. Download a copy, or save them for another day."}
        </p>
        {id && (
          <a className="text-link" href={`/api/reviews/${id}/export`}>
            Download the full PDF
            <Arrow />
          </a>
        )}
      </div>
      <div>
        {sent ? (
          <div className="email-confirmation" role="status">
            <h3>Check your inbox.</h3>
            <p>
              {returning
                ? "If this email has saved reviews, a private sign-in link is on its way."
                : "Your review and a private return link have been accepted by our email service. Open the link within 30 minutes to save your review for 180 days."}
            </p>
          </div>
        ) : enabled ? (
          <form onSubmit={submit}>
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                placeholder="you@yourorganisation.org"
              />
            </label>
            <button className="button primary" disabled={busy}>
              {busy
                ? "Sending…"
                : returning
                  ? "Send my sign-in link"
                  : "Email my report & return link"}
              <Arrow />
            </button>
            <p className="fine-print">
              No marketing. No password.{" "}
              {id
                ? "The email includes your assessment and private access to this review."
                : "The link expires after 30 minutes."}
            </p>
          </form>
        ) : (
          <p className="email-unavailable">
            {enabled === null
              ? "Checking email availability…"
              : "Email saving isn’t available yet."}{" "}
            {id &&
              "You can download your full PDF now. Your browser access continues until the deletion date below."}
          </p>
        )}
        {error && (
          <p className="alert error" role="alert">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
