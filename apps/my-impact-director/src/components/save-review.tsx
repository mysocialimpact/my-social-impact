"use client";
import { useEffect, useState } from "react";
import { api, useSession } from "./session";
import { Arrow } from "./icons";
export function SaveReview({
  id,
  returning = false,
  recovery = false,
}: {
  id?: string;
  returning?: boolean;
  recovery?: boolean;
}) {
  const { user } = useSession();
  const [address, setAddress] = useState("");
  useEffect(() => {
    if (user && !user.anonymous && !recovery) setAddress(user.email);
  }, [user, recovery]);
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
    const email =
      user && !user.anonymous && !recovery
        ? user.email
        : new FormData(e.currentTarget).get("email");
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
  if (user?.emailVerified && !recovery)
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
      id={returning ? "verify-email" : id ? "keep-review" : undefined}
    >
      <div>
        <p className="eyebrow">
          {returning
            ? "PICK UP WHERE YOU LEFT OFF"
            : "YOUR ACCOUNT. YOUR REPORTS."}
        </p>
        <h2>
          {returning
            ? recovery
              ? "Recover your saved reports."
              : "Verify your email."
            : "Keep your reports."}
        </h2>
        <p>
          {returning
            ? recovery
              ? "We’ll send a one-time link to recover your existing saved work. You can then set a password in Account."
              : "Verify your address once to connect reports previously saved by email, and keep or receive detailed results."
            : "Confirm your email to receive your detailed report and keep your work. You can choose a password in Account for next time."}
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
            {user && !user.anonymous && !recovery ? (
              <p>
                We’ll use <strong>{user.email}</strong>. Confirm this address
                once to connect your saved reports and receive detailed results.
              </p>
            ) : (
              <label>
                Email address
                <input
                  name="email"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  readOnly={!!user && !user.anonymous && !recovery}
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  placeholder="you@yourorganisation.org"
                />
              </label>
            )}
            <button className="button primary" disabled={busy}>
              {busy
                ? "Sending…"
                : returning
                  ? recovery
                    ? "Send recovery link"
                    : "Send verification email"
                  : "Email my full report"}
              <Arrow />
            </button>
            <p className="fine-print">
              No marketing.{" "}
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
      {!returning && (!user || user.anonymous) && (
        <p className="save-account-options">
          Prefer email and password?{" "}
          <a
            href={`/login?mode=signup&next=${encodeURIComponent(id ? "/reviews/" + id : "/reviews")}`}
          >
            Create your free account
          </a>{" "}
          or{" "}
          <a
            href={`/login?next=${encodeURIComponent(id ? "/reviews/" + id : "/reviews")}`}
          >
            log in
          </a>
          .
        </p>
      )}
    </section>
  );
}
