"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, useSession } from "./session";
export function AccountSettings() {
  const { user, loading } = useSession(),
    [marketing, setMarketing] = useState(false),
    [ready, setReady] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    if (user && !user.anonymous)
      api("/api/preferences")
        .then((d) => {
          setMarketing(d.opted_in);
          setReady(true);
        })
        .catch((e) => setMessage(e.message));
  }, [user]);
  if (loading) return <p role="status">Opening your account…</p>;
  if (!user || user.anonymous)
    return (
      <>
        <h1>Your account.</h1>
        <p>Log in to manage your details and email preferences.</p>
        <Link href="/login" className="button primary">
          Log in
        </Link>
      </>
    );
  return (
    <div className="account-settings">
      <p className="eyebrow">YOUR PERSONAL WORKSPACE</p>
      <h1>Your account.</h1>
      <section>
        <h2>Email & security</h2>
        <p>
          {user.email} ·{" "}
          {user.emailVerified ? "Email confirmed" : "Confirmation needed"}
        </p>
        {!user.emailVerified && (
          <Link href="/verify-email">Confirm your email →</Link>
        )}
        <p>
          {user.passwordAccount ? (
            <Link href="/forgot-password">Reset your password →</Link>
          ) : (
            <>
              <Link href="/register">Create a password for this account →</Link>
              <br />
              <small>
                Use {user.email}. Your verified reports will stay with you.
              </small>
            </>
          )}
        </p>
      </section>
      <section>
        <h2>News & practical ideas</h2>
        <p>
          Choose whether you hear about My Social Impact news. Account and
          report emails continue regardless of this choice.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api("/api/preferences", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ optedIn: marketing }),
              });
              setMessage(
                marketing
                  ? "Your preference is saved."
                  : "You’re unsubscribed from marketing updates. Your report emails continue.",
              );
            } catch (e) {
              setMessage((e as Error).message);
            }
          }}
        >
          <label className="consent-choice">
            <input
              type="checkbox"
              checked={marketing}
              onChange={(e) => setMarketing(e.target.checked)}
            />
            <span>
              I'd like to receive occasional news, practical ideas and updates
              from My Social Impact.
            </span>
          </label>
          <button className="button primary small" disabled={!ready}>
            Save email preference
          </button>
        </form>
        {message && (
          <p className="alert" role="status">
            {message}
          </p>
        )}
      </section>
      <Link href="/reviews" className="text-link">
        Back to My Reports →
      </Link>
    </div>
  );
}
