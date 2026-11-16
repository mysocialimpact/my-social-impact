"use client";
import Link from "next/link";
import { useSession } from "./session";
import { Account } from "./account";
export function SaveReview({
  id,
  returning = false,
}: {
  id?: string;
  returning?: boolean;
}) {
  const { user, loading } = useSession();
  if (loading) return <p role="status">Opening your account options…</p>;
  if (user?.emailVerified)
    return (
      <section className="workspace-saved">
        <strong>Your assessment is saved.</strong>
        <p>
          We’ll email your full report to {user.email} when it’s ready. You can
          close this page and return to My Reports on any device.
        </p>
        {!user.passwordAccount && (
          <Link href="/register">Create a password for this account →</Link>
        )}
      </section>
    );
  if (user && !user.anonymous)
    return (
      <section className="verification-nudge">
        <h2>Confirm your email. Keep your reports.</h2>
        <p>
          Your account is ready. Confirm {user.email} once to save your work,
          download full assessments and receive completed reports.
        </p>
        <Link href="/verify-email" className="button primary">
          Check your inbox & confirm email →
        </Link>
      </section>
    );
  if (returning)
    return (
      <section className="reports-welcome">
        <p className="eyebrow">YOUR FREE PERSONAL WORKSPACE</p>
        <h1>
          Your reports.
          <br />
          Your progress.
          <br />
          <span>Your Impact Director.</span>
        </h1>
        <p>
          Log in to pick up where you left off, or create a free account to
          start saving your work.
        </p>
        <div className="toolbar">
          <Link href="/login" className="button primary">
            Log in →
          </Link>
          <Link href="/register" className="button secondary">
            Create free account →
          </Link>
        </div>
        {user?.anonymous && (
          <p className="report-adoption-note">
            Your current report is still here. Create an account and confirm
            your email to keep it across devices.
          </p>
        )}
      </section>
    );
  return (
    <section className="processing-account" id="keep-review">
      <div>
        <p className="eyebrow">YOUR FULL REPORTS. FREE.</p>
        <h2>Your Impact Director is working on your report.</h2>
        <p>
          Create your free account and we’ll email your full assessment when
          it’s ready. You can close this page and return whenever you like.
        </p>
        <ul>
          <li>Save your document and all three assessments.</li>
          <li>Download and securely share your findings.</li>
          <li>Pick up where you left off on any device.</li>
        </ul>
      </div>
      <Account
        initialMode="signup"
        compact
        next={id ? "/reviews/" + id : "/reviews"}
      />
    </section>
  );
}
