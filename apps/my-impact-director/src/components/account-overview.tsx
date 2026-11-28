"use client";
import Link from "next/link";
import { useSession } from "./session";

export function AccountOverview({ upgrades }: { upgrades: React.ReactNode }) {
  const { user, loading, error } = useSession();
  if (loading)
    return (
      <div className="account-wrap account-entry">
        <p role="status">Opening your account…</p>
      </div>
    );
  if (error)
    return (
      <div className="account-wrap account-entry">
        <h1>Your account</h1>
        <p role="alert">{error}</p>
        <button
          className="button secondary"
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
      </div>
    );
  if (!user || user.anonymous)
    return (
      <section className="account-wrap account-entry">
        <h1>Your account</h1>
        <p>
          Sign in to open your reports and see what’s included in your account.
        </p>
        <Link className="button primary" href="/login?next=/account">
          Sign in
        </Link>
      </section>
    );
  return (
    <>
      <header className="account-wrap plan-opening">
        <div className="plan-title">
          <h1>
            Your <em>free</em> account.
          </h1>
          <p>
            Everyday AI gives you three ways to look at one impact report.
            Explore the evidence behind your claims, how you manage impact and
            how clearly your report tells the story.
          </p>
          <div className="plan-actions">
            <Link className="button primary" href="/reviews">
              Open My Reports
            </Link>
            <a className="account-text-link" href="#review-upgrades">
              Explore upgrades
            </a>
          </div>
        </div>
        <aside className="plan-includes" aria-labelledby="account-includes">
          <h2 id="account-includes">Included with Everyday AI</h2>
          <ul>
            <li>
              <Link href="/methodology#claims">Social Impact Claims Code</Link>
            </li>
            <li>
              <Link href="/methodology#excellence">
                Social Impact Excellence
              </Link>
            </li>
            <li>
              <Link href="/methodology/impact-report-excellence">
                The Impact Design Review
              </Link>
            </li>
          </ul>
        </aside>
      </header>
      <section
        className="account-upgrades"
        id="review-upgrades"
        aria-labelledby="upgrades-title"
      >
        <div className="account-wrap">
          <div className="upgrade-intro">
            <div>
              <p className="account-status">Coming soon</p>
              <h2 id="upgrades-title">
                Take a review <em>further.</em>
              </h2>
            </div>
            <p>
              Choose a deeper assessment for one report and one framework. Each
              upgrade is a one-off purchase. Your account stays free.
            </p>
          </div>
          {upgrades}
          <Link className="account-text-link" href="/#intelligence">
            Compare the full review options
          </Link>
        </div>
      </section>
      <div className="account-wrap account-details">
        <section aria-labelledby="account-payments">
          <h2 id="account-payments">Payments &amp; receipts</h2>
          <p className="account-status">Coming soon</p>
          <p>
            When purchases open, you’ll pay through Stripe. You can choose to
            save a card for next time, update it and view your receipts from
            here.
          </p>
        </section>
        <section aria-labelledby="account-signin">
          <h2 id="account-signin">Sign-in &amp; security</h2>
          <p className="account-identity">{user.email}</p>
          <p>
            {user.emailVerified
              ? "Email verified."
              : "Verify this address to receive your detailed reports."}
          </p>
          <div className="account-setting-links">
            {!user.emailVerified && (
              <Link
                href="/account/security#verify-email"
                className="account-text-link"
              >
                Verify email
              </Link>
            )}
            <Link className="account-text-link" href="/account/security">
              Manage account settings
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
