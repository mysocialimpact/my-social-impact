"use client";
import { useEffect, useState } from "react";
import { api, useSession } from "./session";
import { Arrow } from "./icons";
export function SaveReview({
  id,
  returning = false,
}: {
  id?: string;
  returning?: boolean;
}) {
  const { user } = useSession();
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
      await api("/api/visitor", { method: "POST" });
      const result = await api("/api/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          account: true,
          ...(id ? { reviewId: id } : {}),
        }),
      });
      if (result.verified) {
        window.location.assign(id ? "/reviews/" + id : "/reviews");
        return;
      }
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  if (user?.emailVerified)
    return (
      <section className="workspace-saved">
        <strong>Your workspace is saved.</strong>
        <p>
          Signed in as {user.email}. Reports are retained until their displayed
          deletion dates. Completed detailed reviews are delivered to this
          address.
        </p>
      </section>
    );
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
            ? "Your personal Impact Director."
            : "Make this your Impact Director."}
        </h2>
        <p>
          {returning
            ? "Enter your email to create or open your workspace. We’ll send a secure sign-in link. No password required."
            : "Save your reports, track your reviews and pick up where you left off — on any device. One secure email link, no password. The same verified address receives your completed detailed reports."}
        </p>
      </div>
      <div>
        {sent ? (
          <div className="email-confirmation" role="status">
            <h3>Check your inbox.</h3>
            <p>
              {returning
                ? "A secure sign-in link is on its way. Confirm it within 30 minutes to open your workspace."
                : "Confirm your address using the private link within 30 minutes. Your detailed report will then be delivered and retained for 180 days."}
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
                  : "Save my workspace — send a sign-in link"}
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
