"use client";
import Link from "next/link";
import { useSession, api } from "./session";
import { useState } from "react";
import { Account } from "./account";
import { SaveReview } from "./save-review";
export function AccountSettings() {
  const { user, loading, error } = useSession(),
    [failure, setFailure] = useState("");
  if (loading) return <p role="status">Opening your account…</p>;
  if (!user || user.anonymous)
    return (
      <div className="simple-account">
        <h1>Your account.</h1>
        <p>
          <Link className="button primary" href="/login?next=/account">
            Log in
          </Link>{" "}
          to manage your account and saved work.
        </p>
      </div>
    );
  return (
    <div className="account-settings">
      <p className="eyebrow">My Reports</p>
      <h1>Account.</h1>
      <p>
        Signed in as <strong>{user.email}</strong>
      </p>
      <p>
        {user.emailVerified
          ? "Email verified."
          : "Verify your address to keep and receive detailed reports."}
      </p>
      <Link href="/reviews">Go to My Reports →</Link>
      {!user.emailVerified && <SaveReview returning />}
      {user.passwordAccount ? (
        <section>
          <h2>Password & security</h2>
          <p>Your password is shared with your My Social Impact account.</p>
          <Link href="/forgot-password">Reset your password →</Link>
        </section>
      ) : (
        <section>
          <h2>Make next time simpler.</h2>
          <p>
            Your email access still works. Choose a password to log in directly
            next time; your existing reports stay with you.
          </p>
          <details>
            <summary>Set up email and password login</summary>
            <Account
              setup
              initialMode="signup"
              email={user.email}
              name={user.name}
              next="/account"
            />
          </details>
        </section>
      )}
      <p>
        <Link href="/reviews">Manage reports and retention →</Link>
      </p>
      {(error || failure) && (
        <p className="alert error" role="alert">
          {failure || error}
        </p>
      )}
      <button
        className="button secondary"
        onClick={async () => {
          try {
            await api("/api/account", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ action: "logout" }),
            });
            window.location.assign("/");
          } catch (e) {
            setFailure(
              e instanceof Error
                ? e.message
                : "Unable to log out. Please try again.",
            );
          }
        }}
      >
        Log out
      </button>
    </div>
  );
}
